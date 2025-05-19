import AuthButton from "../components/AuthButton";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl mb-4">Welcome to Plated</h1>
      <AuthButton />
      <div className="bg-background text-text-primary font-poppins p-8">
      ✔️ If you see an off-white Poppins box, we’re all set!
    </div>

    </main>
  );
}
