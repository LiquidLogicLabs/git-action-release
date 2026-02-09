import { Logger } from '../logger';
import * as core from '@actions/core';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with verbose disabled and debugMode disabled', () => {
    const logger = new Logger(false, false);

    it('should log info messages', () => {
      logger.info('Test message');
      expect(core.info).toHaveBeenCalledWith('Test message');
    });

    it('should log warning messages', () => {
      logger.warning('Warning message');
      expect(core.warning).toHaveBeenCalledWith('Warning message');
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(core.error).toHaveBeenCalledWith('Error message');
    });

    it('should log debug messages using core.debug() when debugMode is false', () => {
      logger.debug('Debug message');
      expect(core.debug).toHaveBeenCalledWith('Debug message');
      expect(core.info).not.toHaveBeenCalled();
    });

    it('should not log verboseInfo messages when verbose is false', () => {
      logger.verboseInfo('Verbose message');
      expect(core.info).not.toHaveBeenCalled();
    });

    it('should expose verbose property', () => {
      expect(logger.verbose).toBe(false);
    });

    it('should expose debugMode property', () => {
      expect(logger.debugMode).toBe(false);
    });

    it('should return false for isVerbose()', () => {
      expect(logger.isVerbose()).toBe(false);
    });

    it('should return false for isDebug()', () => {
      expect(logger.isDebug()).toBe(false);
    });
  });

  describe('with verbose enabled', () => {
    const logger = new Logger(true, false);

    it('should log verboseInfo messages when verbose is true', () => {
      logger.verboseInfo('Verbose message');
      expect(core.info).toHaveBeenCalledWith('Verbose message');
    });

    it('should log debug messages using core.debug() when debugMode is false', () => {
      logger.debug('Debug message');
      expect(core.debug).toHaveBeenCalledWith('Debug message');
      expect(core.info).not.toHaveBeenCalled();
    });

    it('should expose verbose property', () => {
      expect(logger.verbose).toBe(true);
    });

    it('should return true for isVerbose()', () => {
      expect(logger.isVerbose()).toBe(true);
    });
  });

  describe('with debugMode enabled', () => {
    const logger = new Logger(false, true);

    it('should log debug messages using core.info() with [DEBUG] prefix when debugMode is true', () => {
      logger.debug('Debug message');
      expect(core.info).toHaveBeenCalledWith('[DEBUG] Debug message');
      expect(core.debug).not.toHaveBeenCalled();
    });

    it('should set verbose to true when debugMode is true', () => {
      expect(logger.verbose).toBe(true);
    });

    it('should expose debugMode property', () => {
      expect(logger.debugMode).toBe(true);
    });

    it('should return true for isDebug()', () => {
      expect(logger.isDebug()).toBe(true);
    });

    it('should log verboseInfo messages when debugMode implies verbose', () => {
      logger.verboseInfo('Verbose via debug');
      expect(core.info).toHaveBeenCalledWith('Verbose via debug');
    });
  });

  describe('default constructor', () => {
    it('should default to verbose=false and debugMode=false', () => {
      const logger = new Logger();
      expect(logger.verbose).toBe(false);
      expect(logger.debugMode).toBe(false);
      logger.debug('Test');
      expect(core.debug).toHaveBeenCalledWith('Test');
      expect(core.info).not.toHaveBeenCalled();
    });
  });
});
