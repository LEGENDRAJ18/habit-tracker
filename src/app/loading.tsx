export default function Loading() {
  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#7c3aed,#9333ea)", boxShadow: "0 0 30px rgba(124,58,237,0.45)", animation: "pulse 1.5s ease-in-out infinite" }}
        >
          <span style={{ fontSize: 22 }}>✨</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-500"
              style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
