import { describe, expect, it } from "vitest";
import { totalPrice, unitPrice } from "@/lib/options";
import { buildProductsQuery, formatPrice } from "@/lib/products";

describe("buildProductsQuery", () => {
  it("luôn có pageSize, bỏ page=1 và 'Tất cả'", () => {
    expect(buildProductsQuery({ page: 1, category: "Tất cả" })).toBe("pageSize=9");
  });

  it("mã hóa category và q, cắt khoảng trắng", () => {
    const query = new URLSearchParams(
      buildProductsQuery({ page: 2, category: "Trà sữa", q: "  trân châu " }),
    );
    expect(query.get("page")).toBe("2");
    expect(query.get("category")).toBe("Trà sữa");
    expect(query.get("q")).toBe("trân châu");
  });
});

describe("formatPrice / giá tạm tính", () => {
  it("định dạng VND theo kiểu Việt Nam", () => {
    expect(formatPrice(39000)).toBe("39.000đ");
  });

  it("cộng phụ thu size và topping, nhân số lượng", () => {
    const selection = { basePrice: 39000, size: "M" as const, toppingIds: ["tran-chau", "thach"], quantity: 2 };
    expect(unitPrice(selection)).toBe(39000 + 5000 + 10000 + 8000);
    expect(totalPrice(selection)).toBe(124000);
  });
});
