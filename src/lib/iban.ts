export function convertDkToIban(regNo: string, accountNo: string): string {
  const cleanReg = regNo.replace(/\D/g, '').padStart(4, '0');
  const cleanAccount = accountNo.replace(/\D/g, '').padStart(10, '0');
  
  const bban = `${cleanReg}${cleanAccount}`;
  
  // 'D' = 13, 'K' = 14 -> Landekode DKK + "00" til beregning = 131400
  const checksumData = `${bban}131400`;
  const remainder = BigInt(checksumData) % BigInt(97);
  const checkDigits = String(BigInt(98) - remainder).padStart(2, '0');

  return `DK${checkDigits}${bban}`;
}
