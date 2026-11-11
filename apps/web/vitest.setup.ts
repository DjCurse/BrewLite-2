import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// next/image cần cấu hình của Next khi chạy; trong test chỉ cần thẻ <img> thông thường.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
  }: {
    src: string;
    alt: string;
  }) => createElement("img", { src, alt }),
}));
