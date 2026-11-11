import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Menu } from "@/components/menu";
import { jsonResponse, makeListResponse, makeProduct } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function lastUrl(): URL {
  const call = fetchMock.mock.calls.at(-1)!;
  return new URL(String(call[0]));
}

describe("Menu — trạng thái giao diện", () => {
  it("Loading: hiển thị skeleton trong lúc chờ API", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<Menu />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByTestId("menu-skeleton")).toHaveLength(9);
  });

  it("Success: hiển thị danh sách món, giá và liên kết tới trang chi tiết", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeListResponse([
          makeProduct({ id: 1, name: "Matcha Latte", price: 45000 }),
          makeProduct({ id: 2, name: "Cà phê sữa đá", price: 29000, category: "Cà phê" }),
        ]),
      ),
    );

    render(<Menu />);

    expect(await screen.findByText("Matcha Latte")).toBeInTheDocument();
    expect(screen.getByText("45.000đ")).toBeInTheDocument();
    expect(screen.getByText("29.000đ")).toBeInTheDocument();
    expect(screen.getByText("2 món dành cho bạn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chọn món Matcha Latte" })).toHaveAttribute(
      "href",
      "/products/1",
    );
    expect(screen.queryByTestId("menu-skeleton")).not.toBeInTheDocument();
  });

  it("Empty: thực đơn trống, không có bộ lọc", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeListResponse([], {}, [])));

    render(<Menu />);

    expect(await screen.findByText("Thực đơn đang được cập nhật")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa bộ lọc" })).not.toBeInTheDocument();
  });

  it("Empty: không có món khớp bộ lọc, có nút xóa bộ lọc", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(makeListResponse([makeProduct()])));
    render(<Menu />);
    await screen.findByText("Matcha Latte");

    fetchMock.mockResolvedValue(jsonResponse(makeListResponse([])));
    await user.click(screen.getByRole("button", { name: "Cà phê" }));

    expect(await screen.findByText("Không tìm thấy món phù hợp")).toBeInTheDocument();

    fetchMock.mockResolvedValue(jsonResponse(makeListResponse([makeProduct()])));
    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));

    expect(await screen.findByText("Matcha Latte")).toBeInTheDocument();
    expect(lastUrl().searchParams.has("category")).toBe(false);
  });

  it("Error: API trả lỗi 500, hiển thị thông báo và cho phép thử lại", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "boom" }, 500));

    render(<Menu />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được thực đơn");
    expect(screen.getByRole("alert")).toHaveTextContent("Máy chủ trả về lỗi 500");

    fetchMock.mockResolvedValueOnce(jsonResponse(makeListResponse([makeProduct()])));
    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Matcha Latte")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Error: mất kết nối mạng", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<Menu />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không kết nối được máy chủ");
  });
});

describe("Menu — tương tác", () => {
  it("lọc theo danh mục gọi API với tham số category", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(makeListResponse([makeProduct()])));
    render(<Menu />);
    await screen.findByText("Matcha Latte");

    await user.click(screen.getByRole("button", { name: "Cà phê" }));

    await waitFor(() => expect(lastUrl().searchParams.get("category")).toBe("Cà phê"));
    expect(screen.getByRole("button", { name: "Cà phê" })).toHaveAttribute("aria-pressed", "true");
  });

  it("tìm kiếm gọi API với tham số q sau khi ngừng gõ", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(makeListResponse([makeProduct()])));
    render(<Menu />);
    await screen.findByText("Matcha Latte");

    await user.type(screen.getByRole("searchbox", { name: "Tìm món" }), "latte");

    await waitFor(() => expect(lastUrl().searchParams.get("q")).toBe("latte"));
  });

  it("phân trang: chuyển sang trang 2 và khóa nút Trước ở trang đầu", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(makeListResponse([makeProduct()], { total: 12, totalPages: 2 })),
    );
    render(<Menu />);
    await screen.findByText("Matcha Latte");

    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trước/ })).toBeDisabled();

    fetchMock.mockResolvedValue(
      jsonResponse(
        makeListResponse([makeProduct({ id: 10, name: "Trà dâu tằm" })], {
          page: 2,
          total: 12,
          totalPages: 2,
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: /Sau/ }));

    expect(await screen.findByText("Trà dâu tằm")).toBeInTheDocument();
    expect(lastUrl().searchParams.get("page")).toBe("2");
    expect(screen.getByRole("button", { name: /Sau/ })).toBeDisabled();
  });

  it("món hết hàng hiển thị nhãn Hết hàng", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(makeListResponse([makeProduct({ name: "Trà dâu tằm", stock: 0 })])),
    );

    render(<Menu />);

    expect(await screen.findByText("Hết hàng")).toBeInTheDocument();
  });
});
