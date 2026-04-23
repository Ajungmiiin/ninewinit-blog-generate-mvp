import { Sparkles } from "lucide-react";

function Header() {
  return (
    <header className="bg-background border-primary/50 fixed top-0 left-0 z-50 flex h-20 w-full items-center border-b">
      <div className="mx-auto w-full max-w-7xl px-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary flex items-center justify-center rounded-lg p-2">
            <Sparkles className="size-4 text-white" />
          </div>

          <p className="text-sm font-bold text-white">블로그 자동화</p>

          <span className="border-primary bg-primary/30 text-primary rounded-full border px-2 text-xs">
            AI
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header;
