// Builds a PayNow (SGQR / EMVCo) payload string that banking apps can scan.

function field(id: string, value: string) {
  return id + value.length.toString().padStart(2, "0") + value;
}

// CRC16-CCITT checksum, required at the end of every SGQR payload
function crc16(data: string) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

type PayNowOptions = {
  proxyType: "mobile" | "uen";
  proxyValue: string;
  merchantName: string;
  amountCents: number;
  reference: string;
};

export function buildPayNowPayload(o: PayNowOptions) {
  const merchantAccount =
    field("00", "SG.PAYNOW") +
    field("01", o.proxyType === "mobile" ? "0" : "2") +
    field("02", o.proxyValue) +
    field("03", "0"); // 0 = customer can't edit the amount

  const payload =
    field("00", "01") +                            // payload format
    field("01", "12") +                            // 12 = one-time QR with an amount
    field("26", merchantAccount) +                 // PayNow details
    field("52", "0000") +                          // merchant category
    field("53", "702") +                           // currency: SGD
    field("54", (o.amountCents / 100).toFixed(2)) +
    field("58", "SG") +
    field("59", o.merchantName.replace(/[^\x20-\x7E]/g, "").slice(0, 25)) +
    field("60", "Singapore") +
    field("62", field("01", o.reference.slice(0, 25))) + // reference shown in bank app
    "6304";                                        // checksum goes last

  return payload + crc16(payload);
}

export function getPayNowConfig() {
  const proxyValue = process.env.PAYNOW_PROXY_VALUE;
  if (!proxyValue) throw new Error("PAYNOW_PROXY_VALUE is not set");
  return {
    proxyType: process.env.PAYNOW_PROXY_TYPE === "uen" ? ("uen" as const) : ("mobile" as const),
    proxyValue,
    merchantName: process.env.PAYNOW_MERCHANT_NAME ?? "Shop",
  };
}