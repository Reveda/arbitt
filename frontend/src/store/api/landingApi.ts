import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiSuccessResponse } from "@/api/types";
import { baseApi } from "./baseApi";

export interface LandingStatData {
  label: string;
  value: string;
}

export interface AboutHighlightData {
  title: string;
  description: string;
}

export interface FeatureItemData {
  title: string;
  iconName: string;
}

export interface StepItemData {
  id: string;
  title: string;
  note: string;
}

export interface WhyChooseItemData {
  title: string;
  description: string;
  iconName: string;
}
export interface LandingPageContent {
  heroTitle: string;
  heroSubtitle: string;
  copyrightText: string;
  privacyPolicy: string;
  termsConditions: string;
  stats: LandingStatData[];
  aboutHighlights: AboutHighlightData[];
  features: FeatureItemData[];
  onboardingSteps: StepItemData[];
  whyChooseItems: WhyChooseItemData[];
}
export const landingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLandingContent: builder.query<ApiSuccessResponse<LandingPageContent>, void>({
      query: () => API_ENDPOINTS.landing,
      providesTags: ["LandingContent"],
      keepUnusedDataFor: 300, // keep public landing content longer
    }),
    updateLandingContent: builder.mutation<ApiSuccessResponse<LandingPageContent>, LandingPageContent>({
      query: (body) => ({
        body,
        method: "PUT",
        url: API_ENDPOINTS.landing,
      }),
      invalidatesTags: ["LandingContent"],
    }),
  }),
});

export const {
  useGetLandingContentQuery,
  useUpdateLandingContentMutation,
} = landingApi;
