// tests/e2e/lib/test-framework.mjs
// Lightweight, zero-dependency async test framework for Node.js ESM

export class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
    };
  }

  describe(name, fn) {
    const parentSuite = this.currentSuite;
    const suite = {
      name,
      tests: [],
      beforeEachFns: [],
      afterEachFns: [],
      parent: parentSuite,
    };
    if (parentSuite) {
      parentSuite.suites = parentSuite.suites || [];
      parentSuite.suites.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachFns.push(fn);
    } else {
      throw new Error('beforeEach must be placed inside a describe block');
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachFns.push(fn);
    } else {
      throw new Error('afterEach must be placed inside a describe block');
    }
  }

  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be inside a describe block.`);
    }
    this.currentSuite.tests.push({ name, fn, skipped: false });
  }

  xit(name, fn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${name}" must be inside a describe block.`);
    }
    this.currentSuite.tests.push({ name, fn, skipped: true });
  }

  async runSuite(suite, filter = null, results = []) {
    for (const test of suite.tests) {
      if (filter && !test.name.toLowerCase().includes(filter.toLowerCase()) && !suite.name.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }

      this.stats.total++;
      if (test.skipped) {
        this.stats.skipped++;
        results.push({ suite: suite.name, name: test.name, status: 'SKIPPED' });
        continue;
      }

      // Collect all beforeEach hooks up the hierarchy
      const beforeEachHooks = [];
      let s = suite;
      while (s) {
        beforeEachHooks.unshift(...s.beforeEachFns);
        s = s.parent;
      }

      // Collect all afterEach hooks up the hierarchy
      const afterEachHooks = [];
      s = suite;
      while (s) {
        afterEachHooks.push(...s.afterEachFns);
        s = s.parent;
      }

      const startTime = Date.now();
      try {
        for (const hook of beforeEachHooks) {
          await hook();
        }
        await test.fn();
        for (const hook of afterEachHooks) {
          await hook();
        }
        const duration = Date.now() - startTime;
        this.stats.passed++;
        results.push({ suite: suite.name, name: test.name, status: 'PASSED', duration });
      } catch (err) {
        const duration = Date.now() - startTime;
        this.stats.failed++;
        results.push({
          suite: suite.name,
          name: test.name,
          status: 'FAILED',
          error: err.message || String(err),
          stack: err.stack,
          duration,
        });
      }
    }

    if (suite.suites) {
      for (const childSuite of suite.suites) {
        await this.runSuite(childSuite, filter, results);
      }
    }

    return results;
  }

  async run(filter = null) {
    const startTime = Date.now();
    const results = [];
    for (const suite of this.suites) {
      await this.runSuite(suite, filter, results);
    }
    this.stats.durationMs = Date.now() - startTime;
    return { stats: this.stats, results };
  }
}

// Global default instance
export const defaultRunner = new TestRunner();
export const describe = (name, fn) => defaultRunner.describe(name, fn);
export const it = (name, fn) => defaultRunner.it(name, fn);
export const xit = (name, fn) => defaultRunner.xit(name, fn);
export const beforeEach = (fn) => defaultRunner.beforeEach(fn);
export const afterEach = (fn) => defaultRunner.afterEach(fn);

// Rich Assertion library
export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`);
      }
    },
    not: {
      toBe(expected) {
        if (actual === expected) {
          throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`);
        }
      },
      toEqual(expected) {
        if (deepEqual(actual, expected)) {
          throw new Error(`Expected value NOT to deeply equal ${JSON.stringify(expected)}`);
        }
      },
      toContain(item) {
        if (actual && actual.includes && actual.includes(item)) {
          throw new Error(`Expected collection NOT to contain ${JSON.stringify(item)}`);
        }
      },
      toMatch(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        if (regex.test(String(actual))) {
          throw new Error(`Expected "${actual}" NOT to match pattern ${pattern}`);
        }
      },
      toBeNull() {
        if (actual === null) {
          throw new Error('Expected value NOT to be null');
        }
      },
      toBeUndefined() {
        if (actual === undefined) {
          throw new Error('Expected value NOT to be undefined');
        }
      },
      toBeTruthy() {
        if (actual) {
          throw new Error('Expected value NOT to be truthy');
        }
      },
      toBeFalsy() {
        if (!actual) {
          throw new Error('Expected value NOT to be falsy');
        }
      },
      toThrow() {
        if (typeof actual === 'function') {
          try {
            actual();
          } catch (err) {
            throw new Error(`Expected function NOT to throw, but it threw: ${err.message}`);
          }
        }
      },
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new Error(
          `Deep equality failed:\nExpected: ${JSON.stringify(expected, null, 2)}\nReceived: ${JSON.stringify(actual, null, 2)}`
        );
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} <= ${expected}`);
      }
    },
    toContain(item) {
      if (!actual || !actual.includes || !actual.includes(item)) {
        throw new Error(`Expected collection to contain ${JSON.stringify(item)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength(expected) {
      const len = actual ? actual.length : undefined;
      if (len !== expected) {
        throw new Error(`Expected length ${expected}, but got ${len}`);
      }
    },
    toMatch(pattern) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      if (!regex.test(String(actual))) {
        throw new Error(`Expected "${actual}" to match pattern ${pattern}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, but received ${JSON.stringify(actual)}`);
      }
    },
    toThrow(expectedError) {
      if (typeof actual !== 'function') {
        throw new Error(`expect(fn).toThrow() requires a function, got ${typeof actual}`);
      }
      let threw = false;
      let error = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        error = err;
      }
      if (!threw) {
        throw new Error('Expected function to throw an error, but it did not throw.');
      }
      if (expectedError) {
        if (typeof expectedError === 'string' && !error.message.includes(expectedError)) {
          throw new Error(`Expected error message to contain "${expectedError}", but got "${error.message}"`);
        }
        if (expectedError instanceof RegExp && !expectedError.test(error.message)) {
          throw new Error(`Expected error message to match ${expectedError}, but got "${error.message}"`);
        }
      }
    },
  };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}
