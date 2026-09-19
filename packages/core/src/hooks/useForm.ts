"use client";

/**
 * refine.dev'in useForm hook'undan esinlenildi:
 *   - @refinedev/react-hook-form/src/useForm (react-hook-form sarmalayıcısı)
 *   - @refinedev/core/src/hooks/form (action bazlı create/edit mantığı, onFinish, formLoading, saveButtonProps)
 * refine paketleri kurulu değil; yalnızca DX pattern'i kendi DataProvider'ımıza
 * (packages/core/src/dataProvider/types.ts) ve React Query'siz stack'imize uyarlandı.
 */

import { useState, type BaseSyntheticEvent } from "react";
import {
  useForm as useHookForm,
  type FieldValues,
  type UseFormProps as UseHookFormProps,
  type UseFormReturn,
  type Path,
} from "react-hook-form";
import type { DataProvider, HttpError } from "../dataProvider/types";

export type UseFormAction = "create" | "edit";

export type UseFormProps<TVariables extends FieldValues, TResponse = TVariables> = UseHookFormProps<TVariables> & {
  dataProvider: DataProvider;
  resource: string;
  action: UseFormAction;
  /** action: "edit" olduğunda zorunlu */
  id?: string;
  onSuccess?: (data: TResponse) => void;
  onError?: (error: HttpError) => void;
};

export type UseFormReturnType<TVariables extends FieldValues, TResponse = TVariables> = UseFormReturn<TVariables> & {
  onFinish: (values: TVariables) => Promise<void>;
  formLoading: boolean;
  saveButtonProps: {
    disabled: boolean;
    onClick: (e: BaseSyntheticEvent) => void;
  };
};

export function useForm<TVariables extends FieldValues, TResponse = TVariables>({
  dataProvider,
  resource,
  action,
  id,
  onSuccess,
  onError,
  ...rhfProps
}: UseFormProps<TVariables, TResponse>): UseFormReturnType<TVariables, TResponse> {
  const [formLoading, setFormLoading] = useState(false);

  const form = useHookForm<TVariables>(rhfProps);
  const { handleSubmit: handleSubmitRhf, setError } = form;

  const onFinish = async (values: TVariables) => {
    if (action === "edit" && !id) {
      throw new Error('[useForm]: action "edit" için `id` zorunlu.');
    }

    setFormLoading(true);
    try {
      const result =
        action === "edit"
          ? await dataProvider.update<TResponse, TVariables>({ resource, id: id!, variables: values })
          : await dataProvider.create<TResponse, TVariables>({ resource, variables: values });

      onSuccess?.(result.data);
    } catch (error) {
      const httpError = error as HttpError;

      for (const [field, message] of Object.entries(httpError.errors ?? {})) {
        setError(field as Path<TVariables>, {
          message: Array.isArray(message) ? message.join(" ") : message,
        });
      }

      onError?.(httpError);
    } finally {
      setFormLoading(false);
    }
  };

  const saveButtonProps = {
    disabled: formLoading,
    onClick: (e: BaseSyntheticEvent) => {
      void handleSubmitRhf(onFinish)(e);
    },
  };

  return { ...form, onFinish, formLoading, saveButtonProps };
}
