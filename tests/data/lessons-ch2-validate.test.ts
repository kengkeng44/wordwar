import { describe, it, expect } from 'vitest';
import raw from '../../public/lessons-ch2.json';
import { LessonsSchema } from '../../src/data/lessons';

describe('lessons-ch2.json content', () => {
  it('parses successfully against LessonsSchema', () => {
    const result = LessonsSchema.safeParse(raw);
    if (!result.success) {
      console.error(JSON.stringify(result.error.issues.slice(0, 10), null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('contains 24 lessons across all five segmentTypes', () => {
    expect(raw).toHaveLength(24);
    expect(raw[0].id).toBe('kt-ch2-l1');
    expect(raw[0].segmentType).toBe('outer-prologue');
    expect(raw[3].segmentType).toBe('main-story');
    expect(raw[18].segmentType).toBe('aesop-side');
    expect(raw[22].segmentType).toBe('outer-outro');
    expect(raw[23].segmentType).toBe('review');
  });

  it('contains 141 questions total', () => {
    const total = raw.reduce((sum, l) => sum + l.questions.length, 0);
    expect(total).toBe(141);
  });
});
