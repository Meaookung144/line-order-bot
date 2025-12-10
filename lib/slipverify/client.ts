import axios from "axios";

const SLIP_API_URL = "https://connect.slip2go.com/api/verify-slip/qr-code/info";

export interface SlipVerifyResponse {
  code: string;
  message: string;
  data?: {
    transRef: string;
    dateTime: string;
    amount: number;
    ref1?: string | null;
    ref2?: string | null;
    ref3?: string | null;
    receiver: {
      account: {
        name: string;
        bank: {
          account: string; // Masked like xxx-x-x4644-x
        };
        proxy?: string | null;
      };
      bank: {
        id: string;
        name: string;
      };
    };
    sender: {
      account: {
        name: string;
        bank: {
          account: string; // Masked
        };
      };
      bank: {
        id: string;
        name: string;
      };
    };
    decode: string;
    referenceId: string;
  };
}

export async function verifySlip(
  qrCode: string
): Promise<SlipVerifyResponse> {
  if (!process.env.SLIP_APIKEY) {
    throw new Error("SLIP credentials not configured");
  }

  // Build request body - Slip2Go format with checkCondition
  const requestBody: any = {
    payload: {
      qrCode: qrCode,
    },
  };

  // Add checkCondition for automatic validation by Slip2Go API
  const expectedReceiverNameTH = process.env.SLIP_RECEIVER_NAME_TH;
  const expectedReceiverNameEN = process.env.SLIP_RECEIVER_NAME_EN;
  const expectedAccountNumber = process.env.SLIP_ACCOUNT_NUMBER;
  const expectedBankId = process.env.SLIP_RECEIVER_ACCOUNT_TYPE || "006"; // Default to Krung Thai Bank

  if (expectedReceiverNameTH || expectedReceiverNameEN || expectedAccountNumber) {
    const receiverCondition: any = {};

    if (expectedReceiverNameTH) {
      receiverCondition.accountNameTH = expectedReceiverNameTH;
    }

    if (expectedReceiverNameEN) {
      receiverCondition.accountNameEN = expectedReceiverNameEN;
    }

    if (expectedAccountNumber) {
      receiverCondition.accountNumber = expectedAccountNumber;
    }

    if (expectedBankId) {
      receiverCondition.accountType = expectedBankId;
    }

    // checkReceiver must be an array
    requestBody.payload.checkCondition = {
      checkReceiver: [receiverCondition],
    };
  }

  console.log("🌐 Calling Slip2Go API...");
  console.log("📤 Request URL:", SLIP_API_URL);
  console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));
  console.log("📤 Authorization header:", `Bearer ${process.env.SLIP_APIKEY?.substring(0, 10)}...`);

  try {
    const response = await axios.post<SlipVerifyResponse>(
      SLIP_API_URL,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLIP_APIKEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📥 API Response status:", response.status);
    console.log("📥 API Response data:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error("❌ Slip2Go API Error:");
    console.error("Status:", error.response?.status);
    console.error("Data:", JSON.stringify(error.response?.data, null, 2));
    console.error("Message:", error.message);
    throw error;
  }
}
