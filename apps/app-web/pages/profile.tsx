import AuthButton from "../components/AuthButton";

export default function Profile() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="p-4 bg-red-500 text-white mb-8">
        If you see this red box with padding (`p-4` → 1 rem) and bottom margin (`mb-8` → 2 rem), 
        Tailwind is working.
      </div>

      <div className="h-8 w-8 bg-blue-500"></div>
      <div className="mt-8 h-8 w-8 bg-green-500"></div>
      <button className="mt-8 px-6 py-3 bg-primary text-white rounded">
        Press Me
      </button>
    </div>
  );
}
