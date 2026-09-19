"use client";

import { createContext, useContext, type ComponentProps, type HTMLAttributes } from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "../lib/cn";
import { Label } from "../components/Label";

/** react-hook-form'un FormProvider'ı — <Form {...useForm()}> şeklinde kullan */
export const Form = FormProvider;

type FormFieldContextValue = { name: string };
const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * Tek bir alanı react-hook-form'a bağlar.
 * Kullanım: <FormField control={form.control} name="email" render={({ field }) => <Input {...field} />} />
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  if (!fieldContext) {
    throw new Error("useFormField, <FormField> içinde kullanılmalı.");
  }
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  return { name: fieldContext.name, ...fieldState };
}

export function FormItem({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function FormLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { error } = useFormField();
  return <Label className={cn(error && "text-destructive", className)} {...props} />;
}

export function FormMessage({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { error } = useFormField();
  const body = error ? String(error.message ?? "Geçersiz değer") : children;
  if (!body) {
    return null;
  }
  return (
    <p className={cn("text-xs text-destructive", className)} {...props}>
      {body}
    </p>
  );
}
