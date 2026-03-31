"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type RequestDemoModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const INITIAL_FORM = {
  name: "",
  email: "",
  companyName: "",
  monthlyCallVolume: "",
};

// Replace this value if you move the form to a different Formspree endpoint later.
const REQUEST_DEMO_FORM_ENDPOINT = "https://formspree.io/f/xojpdgyl";

function getTrimmedFormValues(formValues: typeof INITIAL_FORM) {
  return {
    name: formValues.name.trim(),
    email: formValues.email.trim(),
    companyName: formValues.companyName.trim(),
    monthlyCallVolume: formValues.monthlyCallVolume.trim()
  };
}

function validateFormValues(formValues: typeof INITIAL_FORM) {
  const trimmedValues = getTrimmedFormValues(formValues);

  if (!trimmedValues.name || !trimmedValues.email || !trimmedValues.companyName) {
    return "Please complete all required fields.";
  }

  return "";
}

export function RequestDemoModal({ isOpen, onClose }: RequestDemoModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formValues, setFormValues] = useState(INITIAL_FORM);
  const titleId = useId();
  const descriptionId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsSubmitted(false);
      setIsSubmitting(false);
      setErrorMessage("");
      setFormValues(INITIAL_FORM);

      const rafId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => window.cancelAnimationFrame(rafId);
    }

    setIsVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsRendered(false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isSubmitted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, isSubmitted]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isRendered]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRendered, onClose]);

  if (!isRendered) {
    return null;
  }

  const submitState = isSubmitted ? "success" : isSubmitting ? "loading" : errorMessage ? "error" : "idle";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationError = validateFormValues(formValues);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!REQUEST_DEMO_FORM_ENDPOINT) {
      setErrorMessage("Form submission is not configured yet.");
      return;
    }

    const trimmedValues = getTrimmedFormValues(formValues);

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(REQUEST_DEMO_FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name: trimmedValues.name,
          email: trimmedValues.email,
          company: trimmedValues.companyName,
          monthly_call_volume: trimmedValues.monthlyCallVolume,
          source: "landing_page_demo_modal"
        })
      });

      if (!response.ok) {
        let nextErrorMessage = "Something went wrong. Please try again.";

        try {
          const data = (await response.json()) as { errors?: Array<{ message?: string }> };
          nextErrorMessage = data.errors?.[0]?.message || nextErrorMessage;
        } catch {
          nextErrorMessage = "Something went wrong. Please try again.";
        }

        setErrorMessage(nextErrorMessage);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setErrorMessage("Unable to send your request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="landing-modal fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:px-6"
      data-open={isVisible}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="landing-modal-backdrop absolute inset-0" data-open={isVisible} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="landing-modal-panel surface-primary ui-scrollbar relative z-[1] w-full max-w-[560px] overflow-y-auto p-6 sm:p-8"
        data-open={isVisible}
      >
        <button
          type="button"
          onClick={onClose}
          className="button-secondary-ui absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center text-[18px] leading-none sm:right-5 sm:top-5"
          aria-label="Close request demo modal"
        >
          ×
        </button>

        {isSubmitted ? (
          <div className="pr-10">
            <div className="type-label-text text-[11px]">Request received</div>
            <h2 id={titleId} className="type-page-title mt-4 text-[30px] sm:text-[34px]">
              Demo request received
            </h2>
            <p id={descriptionId} className="type-body-text mt-4 max-w-[420px] text-[15px]">
              We&apos;ll review your request and reach out within 24 hours.
            </p>
            <p className="type-body-text mt-2 max-w-[420px] text-[14px]">We typically respond within a few hours.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="button-primary-accent landing-form-submit inline-flex h-12 items-center justify-center px-6 text-[15px]"
                data-state={submitState}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setFormValues(INITIAL_FORM);
                }}
                className="button-secondary-ui inline-flex h-12 items-center justify-center px-6 text-[15px]"
              >
                Submit another request
              </button>
            </div>
          </div>
        ) : (
          <div className="pr-10">
            <div className="type-label-text text-[11px]">Request a demo</div>
            <h2 id={titleId} className="type-page-title mt-4 text-[30px] sm:text-[34px]">
              See what revenue you&apos;re missing
            </h2>
            <p id={descriptionId} className="type-body-text mt-4 max-w-[460px] text-[15px]">
              We&apos;ll analyse your calls and show where high-intent leads didn&apos;t convert.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <input type="hidden" name="source" value="landing_page_demo_modal" />

              <label className="block">
                <span className="type-section-title mb-2 block text-[14px]">Name</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  required
                  value={formValues.name}
                  onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                  className="landing-form-input h-12 w-full px-4"
                  autoComplete="name"
                />
              </label>

              <label className="block">
                <span className="type-section-title mb-2 block text-[14px]">Work Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                  className="landing-form-input h-12 w-full px-4"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="type-section-title mb-2 block text-[14px]">Company Name</span>
                <input
                  type="text"
                  name="company"
                  required
                  value={formValues.companyName}
                  onChange={(event) => setFormValues((current) => ({ ...current, companyName: event.target.value }))}
                  className="landing-form-input h-12 w-full px-4"
                  autoComplete="organization"
                />
              </label>

              <label className="block">
                <span className="type-section-title mb-2 block text-[14px]">Monthly Call Volume</span>
                <input
                  type="text"
                  name="monthly_call_volume"
                  value={formValues.monthlyCallVolume}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, monthlyCallVolume: event.target.value }))
                  }
                  className="landing-form-input h-12 w-full px-4"
                  placeholder="Optional"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B91C1C]">
                  {errorMessage}
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button-primary-accent landing-form-submit inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-[15px]"
                  data-state={submitState}
                >
                  {isSubmitting ? (
                    <>
                      <span className="landing-button-spinner" aria-hidden="true" />
                      Sending...
                    </>
                  ) : errorMessage ? (
                    "Request Demo Again"
                  ) : (
                    "Request Demo"
                  )}
                </button>
                <p className="type-body-text mt-3 text-center text-[13px]">
                  We&apos;ll review your request and respond within 24 hours.
                </p>
                <p className="type-body-text mt-2 text-center text-[12px] leading-6">
                  By submitting this form, you agree to our{" "}
                  <Link href="/privacy" className="font-medium text-[var(--accent)] no-underline hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" className="font-medium text-[var(--accent)] no-underline hover:underline">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
