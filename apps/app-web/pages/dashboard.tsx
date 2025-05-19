import { getSession } from "next-auth/react";
import AuthButton from "../components/AuthButton";

export default function Dashboard() {
  return (
    <div className="p-8">
      <AuthButton />
      <h1 className="text-2xl mt-4">Dashboard</h1>
      <p className="mt-2">You’re successfully signed in!</p>
    </div>
  );
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return {
    props: { session },
  };
}
