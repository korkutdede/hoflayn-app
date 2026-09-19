"use client";

import { useActionState, useState } from "react";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
  type CoverOption,
  type ProductActionState,
} from "../_actions/product-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslator } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const initial: ProductActionState = {};

type ProductFormValues = {
  id?: string;
  name: string;
  description: string;
  price: string;
  costPrice: string;
  stockQuantity: number;
  category: string;
  tags: string;
  coverImageId: string | null;
};

export function ProductForm({
  mode,
  values,
  covers,
}: {
  mode: "create" | "edit";
  values: ProductFormValues;
  covers: CoverOption[];
}) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteProductAction,
    initial,
  );
  const [coverImageId, setCoverImageId] = useState(values.coverImageId ?? "");
  const t = useTranslator();

  return (
    <>
    <form action={formAction} className="space-y-5">
      {mode === "edit" && values.id ? (
        <input type="hidden" name="productId" value={values.id} />
      ) : null}
      <input type="hidden" name="coverImageId" value={coverImageId} />

      <div className="space-y-2">
        <Label htmlFor="name">{t("products.form.name")}</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={values.name}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("products.form.description")}</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={values.description}
          rows={5}
          className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">{t("products.form.price")}</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.price}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPrice">{t("products.form.cost")}</Label>
          <Input
            id="costPrice"
            name="costPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.costPrice}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stockQuantity">{t("products.form.stock")}</Label>
          <Input
            id="stockQuantity"
            name="stockQuantity"
            type="number"
            min="0"
            defaultValue={values.stockQuantity}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">{t("products.form.category")}</Label>
          <Input
            id="category"
            name="category"
            defaultValue={values.category}
            placeholder={t("products.form.categoryPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">{t("products.form.tags")}</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={values.tags}
            placeholder={t("products.form.tagsPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("products.form.cover")}</Label>
        {covers.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("products.form.coverEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setCoverImageId("")}
              className={cn(
                "flex h-24 items-center justify-center rounded-md border text-xs",
                !coverImageId
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 bg-white",
              )}
            >
              {t("products.form.coverNone")}
            </button>
            {covers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCoverImageId(c.id)}
                className={cn(
                  "overflow-hidden rounded-md border",
                  coverImageId === c.id
                    ? "border-zinc-900 ring-2 ring-zinc-900"
                    : "border-zinc-200",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.url}
                  alt=""
                  className="h-24 w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending
          ? t("products.form.saving")
          : mode === "create"
            ? t("products.form.create")
            : t("products.form.update")}
      </Button>
    </form>

      {mode === "edit" && values.id ? (
        <form action={deleteAction} className="mt-6 border-t border-zinc-200 pt-6">
          <input type="hidden" name="productId" value={values.id} />
          {deleteState.error ? (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {deleteState.error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={deletePending}
            onClick={(e) => {
              if (!window.confirm(t("products.form.deleteConfirm"))) {
                e.preventDefault();
              }
            }}
          >
            {deletePending
              ? t("products.form.deleting")
              : t("products.form.delete")}
          </Button>
        </form>
      ) : null}
    </>
  );
}
