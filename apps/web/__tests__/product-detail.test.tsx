import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductDetail } from "@/components/product-detail";
import { PRODUCT_SELECTED_EVENT, type ProductSelectedDetail } from "@/lib/options";
import { jsonResponse, makeProduct } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("ProductDetail — trạng thái giao diện", () => {
  it("Loading: hiển thị skeleton", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<ProductDetail id={1} />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("Not found: API trả 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "not found" }, 404));

    render(<ProductDetail id={999} />);

    expect(await screen.findByText("Không tìm thấy món này")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về thực đơn" })).toHaveAttribute("href", "/");
  });

  it("Not found: id không hợp lệ, không gọi API", () => {
    render(<ProductDetail id={Number.NaN} />);

    expect(screen.getByText("Không tìm thấy món này")).toBeInTheDocument();
  });

  it("Error: lỗi máy chủ, có thể thử lại", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 503));

    render(<ProductDetail id={1} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ trả về lỗi 503");

    fetchMock.mockResolvedValueOnce(jsonResponse(makeProduct()));
    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByRole("heading", { name: "Matcha Latte" })).toBeInTheDocument();
  });
});

describe("ProductDetail — chọn Size, Topping, số lượng", () => {
  async function renderLoaded(overrides = {}) {
    fetchMock.mockResolvedValue(jsonResponse(makeProduct(overrides)));
    const user = userEvent.setup();
    render(<ProductDetail id={1} />);
    await screen.findByRole("heading", { name: "Matcha Latte" });
    return user;
  }

  it("mặc định Size S, không topping: tổng tiền bằng giá gốc", async () => {
    await renderLoaded();

    expect(screen.getByRole("radio", { name: /Size S/ })).toBeChecked();
    expect(screen.getByTestId("total-price")).toHaveTextContent("45.000đ");
  });

  it("đổi size và thêm topping thì tổng tiền cập nhật", async () => {
    const user = await renderLoaded();

    await user.click(screen.getByRole("radio", { name: /Size L/ }));
    await user.click(screen.getByRole("checkbox", { name: /Trân châu/ }));

    // 45.000 + 10.000 (size L) + 10.000 (trân châu)
    expect(screen.getByTestId("total-price")).toHaveTextContent("65.000đ");

    await user.click(screen.getByRole("checkbox", { name: /Trân châu/ }));
    expect(screen.getByTestId("total-price")).toHaveTextContent("55.000đ");
  });

  it("số lượng nhân vào tổng tiền và bị chặn trong khoảng 1..tồn kho", async () => {
    const user = await renderLoaded({ stock: 2 });

    expect(screen.getByRole("button", { name: "Giảm số lượng" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Tăng số lượng" }));

    expect(screen.getByTestId("total-price")).toHaveTextContent("90.000đ");
    expect(screen.getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
  });

  it("nút Thêm vào giỏ phát sự kiện brewlite:product-selected với lựa chọn hiện tại", async () => {
    const user = await renderLoaded();
    const listener = vi.fn();
    window.addEventListener(PRODUCT_SELECTED_EVENT, listener);

    await user.click(screen.getByRole("radio", { name: /Size M/ }));
    await user.click(screen.getByRole("checkbox", { name: /Kem/ }));
    await user.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    await user.click(screen.getByRole("button", { name: "Thêm vào giỏ hàng" }));

    window.removeEventListener(PRODUCT_SELECTED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0][0] as CustomEvent<ProductSelectedDetail>).detail;
    expect(detail).toEqual({
      productId: 1,
      productName: "Matcha Latte",
      size: "M",
      toppings: ["kem"],
      quantity: 2,
    });
    expect(screen.getByRole("button", { name: "Đã chọn món ✓" })).toBeInTheDocument();
  });

  it("món hết hàng: nút bị khóa", async () => {
    await renderLoaded({ stock: 0 });

    expect(screen.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  });
});
