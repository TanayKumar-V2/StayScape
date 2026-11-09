'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  CreatePaymentOrderResponse,
  RazorpayCheckoutSuccessResponse,
  RazorpayCheckoutErrorResponse,
} from '@/types/payment';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export interface UseRazorpayOptions {
  onSuccess: (response: RazorpayCheckoutSuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
  onError?: (error: RazorpayCheckoutErrorResponse) => void;
}

function restoreBodyScroll() {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }
}

export function useRazorpay({ onSuccess, onDismiss, onError }: UseRazorpayOptions) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Clean up any locked scroll styles on mount and unmount
  useEffect(() => {
    restoreBodyScroll();
    return () => {
      restoreBodyScroll();
    };
  }, []);

  // Dynamically inject Razorpay Checkout script if not already present
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.Razorpay) {
      setIsLoaded(true);
      return;
    }

    const scriptId = 'razorpay-checkout-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        setIsLoaded(true);
      };

      script.onerror = () => {
        setLoadError(
          'Failed to load Razorpay payment gateway script. Please check your internet connection.',
        );
      };

      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsLoaded(true));
      script.addEventListener('error', () =>
        setLoadError('Failed to load Razorpay payment gateway script.'),
      );
    }
  }, []);

  const openCheckout = useCallback(
    (order: CreatePaymentOrderResponse) => {
      if (!window.Razorpay) {
        setLoadError('Razorpay SDK is not ready yet. Please wait a moment and try again.');
        return;
      }

      const prefill: Record<string, string> = {};
      if (order.user?.name) prefill.name = order.user.name;
      if (order.user?.email) prefill.email = order.user.email;
      if (order.user?.contact) prefill.contact = order.user.contact;

      const options: Record<string, unknown> = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'StayScape',
        description: `Reservation for ${order.propertyTitle}`,
        order_id: order.orderId,
        prefill,
        theme: {
          color: '#637C69', // StayScape signature brand green
        },
        modal: {
          ondismiss: () => {
            restoreBodyScroll();
            if (onDismiss) {
              onDismiss();
            }
          },
          escape: true,
          backdropclose: false,
        },
        handler: (response: RazorpayCheckoutSuccessResponse) => {
          restoreBodyScroll();
          void onSuccess(response);
        },
      };

      try {
        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', (failResponse: unknown) => {
          restoreBodyScroll();
          if (onError) {
            onError(failResponse as RazorpayCheckoutErrorResponse);
          }
        });

        rzp.open();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to launch Razorpay checkout modal.';
        setLoadError(msg);
      }
    },
    [onSuccess, onDismiss, onError],
  );

  return {
    isLoaded,
    loadError,
    openCheckout,
  };
}
