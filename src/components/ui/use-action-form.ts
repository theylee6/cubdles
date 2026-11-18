"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Runs a server action from a form WITHOUT React's automatic form reset,
 * so what someone typed survives a validation error.
 *
 *   const { state, pending, formProps } = useActionForm(saveBasics);
 *   <form {...formProps}>…</form>
 */
export function useActionForm<S extends object>(action: (prev: S, formData: FormData) => Promise<S>, initial: S = {} as S) {
  const [state, dispatch] = useActionState<S, FormData>(action, initial as Awaited<S>);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return { state, pending, formProps: { onSubmit, noValidate: true } as const };
}
