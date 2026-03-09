export type UsageMode = "guest" | "saved_profile";

export interface CredentialDraft {
  clientId: string;
  clientSecret: string;
  merchantCode: string;
}

export interface PaymentCredentialProfile extends CredentialDraft {
  id: string;
  profileName: string;
}
