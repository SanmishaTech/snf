import React from "react";
import { describe, it, expect } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductDetailPage from "../components/ProductDetailPage";
import { products } from "../data/products";

const renderWithRouter = (initialEntries: string[]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/snf/product/:id" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("SNF ProductDetailPage", () => {
  it("renders skeleton while loading and then shows product data", async () => {
    const p = products[0];
    renderWithRouter([`/snf/product/${p.id}`]);

    // Loading skeleton present
    expect(screen.getByRole("heading", { name: /product details/i })).toBeTruthy();

    // Wait for product title to appear
    await waitFor(() => {
      expect(screen.getByText(p.title)).toBeInTheDocument();
    });

    // Price (effective after discount if any)
    const effectivePrice = (p.price * (1 - (p.discountPct || 0) / 100)).toFixed(2);
    expect(screen.getAllByText(new RegExp(`₹${effectivePrice}`))).toBeTruthy();
  });

  it("shows error state for unknown product id", async () => {
    renderWithRouter([`/snf/product/does-not-exist`]);

    await waitFor(() => {
      expect(screen.getByText(/unable to load product/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to listing/i })).toBeInTheDocument();
  });

  it("thumbnail click changes main image", async () => {
    const p = products[0];
    renderWithRouter([`/snf/product/${p.id}`]);

    await waitFor(() => {
      expect(screen.getByText(p.title)).toBeInTheDocument();
    });

    const thumbButtons = screen.getAllByRole("button", { name: /show image/i });
    expect(thumbButtons.length).toBeGreaterThan(1);

    // Click second thumbnail and ensure aria/alt updates on main image
    fireEvent.click(thumbButtons[1]);

    // The main image alt contains "image 2"
    const mainImage = screen.getByAltText(new RegExp(`${p.title} - image 2`, "i"));
    expect(mainImage).toBeInTheDocument();
  });

  it("sticky CTA buttons exist", async () => {
    const p = products[0];
    renderWithRouter([`/snf/product/${p.id}`]);

    await waitFor(() => {
      expect(screen.getByText(p.title)).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: /add .* to cart/i })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /buy now/i })).toBeTruthy();
  });
});