import { normalizeListProductsQuery } from './list-products-query';

describe('normalizeListProductsQuery', () => {
  it('trả về mặc định khi không có tham số', () => {
    expect(normalizeListProductsQuery()).toEqual({
      page: 1,
      pageSize: 9,
      category: undefined,
      q: undefined,
    });
  });

  it('bỏ qua giá trị rỗng hoặc chỉ có khoảng trắng', () => {
    expect(normalizeListProductsQuery({ category: '  ', q: '   ' })).toEqual(
      expect.objectContaining({ category: undefined, q: undefined }),
    );
  });

  it('pageSize = 0 hoặc âm quay về mặc định, quá lớn bị chặn ở 50', () => {
    expect(normalizeListProductsQuery({ pageSize: '0' }).pageSize).toBe(9);
    expect(normalizeListProductsQuery({ pageSize: '-1' }).pageSize).toBe(9);
    expect(normalizeListProductsQuery({ pageSize: '51' }).pageSize).toBe(50);
  });
});
