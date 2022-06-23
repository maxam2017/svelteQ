import { alphabeticalSort } from '../src/utils';

describe('utils for query implementation', () => {
  it('should compare via alphabetical order', () => {
    let list = ['a', 'g', 'b', 'f', 'e', 'd', 'c'];
    list.sort(alphabeticalSort);

    expect(list).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });
});
