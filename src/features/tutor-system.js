/**
 * ==========================================
 * 助教系统 (TutorSystem)
 * ==========================================
 * 管理助教系统和吐槽逻辑
 */

import { Store } from '../core/store.js';
import { API } from '../services/api.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { TUTORS } from '../data/tutors.js';
import { TUTOR_MODE_SETTINGS } from '../data/constants.js';

export const TutorSystem = {
  current: 'marcus',
  isRandomMode: true,
  config: null,
  lastRoastTime: 0,
  lastTextLength: 0,
  charsSinceLastRoast: 0,
  typingTimer: null,
  slowWriterTimer: null,
  activeRoastRequest: null,

  init() {
    this.config = Store.getTutorConfig();
    const savedTutor = Store.getTutor();
    if (savedTutor === 'random') {
      this.isRandomMode = true;
      this.current = this._getRandomTutor();
    } else if (TUTORS[savedTutor]) {
      this.isRandomMode = false;
      this.current = savedTutor;
    }
  },

  _getRandomTutor() {
    const tutorIds = Object.keys(TUTORS);
    return tutorIds[Math.floor(Math.random() * tutorIds.length)];
  },

  _getCurrentTutor() {
    if (this.isRandomMode) {
      return this._getRandomTutor();
    }
    return this.current;
  },

  switch(tutorId) {
    if (tutorId === 'random') {
      this.isRandomMode = true;
      this.current = this._getRandomTutor();
      Store.set('current_tutor', 'random');
      eventBus.emit(EVENTS.TUTOR_SWITCHED, { tutorId: 'random' });
      console.log('[TutorSystem] Switched to random mode');
      return true;
    }
    
    if (!TUTORS[tutorId]) {
      console.error('[TutorSystem] Unknown tutor:', tutorId);
      return false;
    }
    this.isRandomMode = false;
    this.current = tutorId;
    Store.set('current_tutor', tutorId);
    eventBus.emit(EVENTS.TUTOR_SWITCHED, { tutorId });
    console.log('[TutorSystem] Switched to:', tutorId);
    return true;
  },

  updateConfig(mode) {
    const settings = TUTOR_MODE_SETTINGS[mode];
    this.config = { mode, ...settings };
    Store.set('tutor_config', this.config);
  },

  handleInput(currentText) {
    if (this.config.mode === 'manual') return;

    const currentLength = currentText.length;
    const now = Date.now();
    const charsAdded = currentLength - this.lastTextLength;
    const minutesSinceLastRoast = (now - this.lastRoastTime) / (1000 * 60);

    if (minutesSinceLastRoast < this.config.cooldownMinutes) {
      this.charsSinceLastRoast += Math.max(0, charsAdded);
      this.lastTextLength = currentLength;
      return;
    }

    this.charsSinceLastRoast += Math.max(0, charsAdded);

    switch (this.config.mode) {
      case 'high':
        if (this.charsSinceLastRoast >= this.config.charThreshold && currentLength > 0) {
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }, this.config.idleThreshold);
        }
        break;

      case 'normal':
        if (this._detectParagraphEnd(currentText)) {
          this.triggerBriefRoast(currentText);
          this.charsSinceLastRoast = 0;
        } else if (this.charsSinceLastRoast >= this.config.charThreshold && currentLength > 0) {
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }, this.config.idleThreshold);
        }
        break;

      case 'low':
        if (this.charsSinceLastRoast >= this.config.charThreshold && currentLength > 0) {
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }, this.config.idleThreshold);
        }
        break;

      case 'slow':
        clearTimeout(this.slowWriterTimer);
        this.slowWriterTimer = setTimeout(() => {
          if (currentText.length > 0) {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }
        }, this.config.slowWriterThreshold || 60000);
        break;
    }

    this.lastTextLength = currentLength;
  },

  _detectParagraphEnd(text) {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.length > this._lastParagraphCount;
  },

  _lastParagraphCount: 0,

  async _executeRoast(textToAnalyze, contextPrompt, isBrief) {
    if (this.activeRoastRequest) {
      this.activeRoastRequest.abort();
    }
    
    const controller = new AbortController();
    this.activeRoastRequest = controller;
    
    this.lastRoastTime = Date.now();
    this.charsSinceLastRoast = 0;
    
    const actualTutorId = this._getCurrentTutor();
    const tutor = TUTORS[actualTutorId];
    
    try {
      const response = await API.call(textToAnalyze, contextPrompt, 0.8, controller.signal);
      eventBus.emit(EVENTS.TUTOR_ROAST, { 
        message: response, 
        tutorId: actualTutorId,
        isBrief 
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[TutorSystem] 吐槽请求被中断');
      } else {
        eventBus.emit(EVENTS.TUTOR_ERROR, { error: err, isBrief });
        console.error('Roast error:', err);
      }
    } finally {
      if (this.activeRoastRequest === controller) {
        this.activeRoastRequest = null;
      }
    }
  },

  async triggerBriefRoast(text) {
    if (!text || text.length < 5) return;
    const latestParagraph = text.split('\n\n').pop().slice(0, 100);
    const actualTutorId = this._getCurrentTutor();
    const tutor = TUTORS[actualTutorId];
    const prompt = `${tutor.briefPrompt}\n\n用户正在写的内容："${latestParagraph}"`;
    await this._executeRoast(latestParagraph, prompt, true);
  },

  async roastManual(text) {
    const actualTutorId = this._getCurrentTutor();
    const tutor = TUTORS[actualTutorId];
    if (!text) {
      eventBus.emit(EVENTS.TUTOR_ROAST, { 
        message: tutor.intro, 
        tutorId: actualTutorId,
        isBrief: false,
        isIntro: true
      });
      return;
    }

    const latestParagraphs = text.split('\n\n').slice(-2).join('\n\n');
    let prompt = `${tutor.prompt}\n\n[重要：请针对用户下面的具体写作内容进行点评，引用或关联其中的具体内容。]`;
    
    await this._executeRoast(`请点评这段文字："${latestParagraphs}"`, prompt, false);
  }
};
