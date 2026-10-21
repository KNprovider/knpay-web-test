export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 [text-shadow:0_0_8px_#141414,0_0_18px_#141414,0_0_28px_#141414]">
          <h1 className="mb-1 text-2xl font-extrabold tracking-wide text-white">KNprovider</h1>
          <p className="text-xs text-white">Known. Needed. Proven.</p>
        </div>

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-cyan-400" />
          <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
            Henter data...
          </p>
        </div>
      </div>
    </div>
  );
}
