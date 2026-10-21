export function convertDkToIban(regNo: string, accountNo: string): string {
  const cleanReg = regNo.replace(/\D/g, '').padStart(4, '0');
  const cleanAccount = accountNo.replace(/\D/g, '').padStart(10, '0');
  
  const bban = `${cleanReg}${cleanAccount}`;
  
  // 'D' = 13, 'K' = 20 -> country code "DK" + "00" for the checksum calculation
  const checksumData = `${bban}132000`;
  const remainder = BigInt(checksumData) % BigInt(97);
  const checkDigits = String(BigInt(98) - remainder).padStart(2, '0');

  return `DK${checkDigits}${bban}`;
}
