"use client";

import { useCallback, useState } from "react";

export type BillingInterval = "month" | "year";

export type SubscriptionModalView =
  | "overview"
  | "cancel-confirm"
  | "update-payment"
  | "plan-change-review";

type OpenSubscriptionModalOptions = {
  view?: SubscriptionModalView;
  pendingPlan?: string | null;
  billingInterval?: BillingInterval;
};

type LaunchBillingPlanOptions = {
  planId: string;
  currentPlan: string;
  interval?: BillingInterval;
};

type LaunchPricingPlanOptions = {
  planId: string;
};

export function useSubscriptionFlow(options: { initialBillingInterval?: BillingInterval } = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState<SubscriptionModalView>("overview");
  const [modalPendingPlan, setModalPendingPlan] = useState<string | null>(null);
  const [modalBillingInterval, setModalBillingInterval] = useState<BillingInterval>(options.initialBillingInterval || "month");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const openModal = useCallback((modalOptions: OpenSubscriptionModalOptions = {}) => {
    if (modalOptions.billingInterval) {
      setModalBillingInterval(modalOptions.billingInterval);
    }
    if (modalOptions.view) {
      setModalInitialView(modalOptions.view);
    }
    if ("pendingPlan" in modalOptions) {
      setModalPendingPlan(modalOptions.pendingPlan ?? null);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleBillingInterval = useCallback(() => {
    setModalBillingInterval(current => current === "month" ? "year" : "month");
  }, []);

  const openPaymentMethod = useCallback(() => {
    openModal({
      view: "update-payment",
      pendingPlan: null,
    });
  }, [openModal]);

  const openCancellation = useCallback(() => {
    setModalPendingPlan("Hobby");
    setIsModalOpen(true);
  }, []);

  const openPlanReview = useCallback((planId: string, interval?: BillingInterval) => {
    openModal({
      view: "plan-change-review",
      pendingPlan: planId,
      billingInterval: interval,
    });
  }, [openModal]);

  const launchBillingPlan = useCallback(({ planId, currentPlan, interval }: LaunchBillingPlanOptions) => {
    if (interval) {
      setModalBillingInterval(interval);
    }

    if (planId === "Hobby" && currentPlan !== "Hobby") {
      setModalPendingPlan("Hobby");
      setModalInitialView("overview");
      setIsModalOpen(true);
      return true;
    }

    if (currentPlan === "Hobby" && planId !== "Hobby") {
      openPlanReview(planId, interval);
      return true;
    }

    if (currentPlan !== "Hobby" && planId !== "Hobby" && planId !== currentPlan) {
      openPlanReview(planId, interval);
      return true;
    }

    return false;
  }, [openPlanReview]);

  const launchPricingPlan = useCallback(({ planId }: LaunchPricingPlanOptions) => {
    setLoadingPlanId(planId);
    try {
      openPlanReview(planId);
    } finally {
      setLoadingPlanId(null);
    }
  }, [openPlanReview]);

  return {
    isModalOpen,
    modalInitialView,
    modalPendingPlan,
    modalBillingInterval,
    loadingPlanId,
    closeModal,
    launchBillingPlan,
    launchPricingPlan,
    openCancellation,
    openModal,
    openPaymentMethod,
    openPlanReview,
    setLoadingPlanId,
    toggleBillingInterval,
  };
}
