"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Image src="/bridge.png" alt="The Bridge" width={80} height={80} />
        <h1 className="text-2xl font-bold">
          BRDG
        </h1>
        <SignOutButton />
      </header>
      <main className="p-8 flex flex-col gap-8">
        <Content />
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <Button
          variant="destructive"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </Button>
      )}
    </>
  );
}

function Content() {
  const { viewer, numbers } =
    useQuery(api.myFunctions.listNumbers, {
      count: 10,
    }) ?? {};
  // const addNumber = useMutation(api.myFunctions.addNumber);

  if (viewer === undefined || numbers === undefined) {
    return (
      <div className="mx-auto">
        <p>loading... (consider a loading skeleton)</p>
      </div>
    );
  }

  return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Original ASA Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 222 },
                    { date: "2025-07-02", price: 499 },
                    { date: "2025-07-03", price: 235 },
                    { date: "2025-07-04", price: 301 },
                    { date: "2025-07-05", price: 247 },
                ]} teamMembers={["Aidan Ferguson", "Sagar Chethan", "Akshaiyram Reguram"]} teamName={"AFSCKAR"} />
                
                {/* Shahar Dagan Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 180 },
                    { date: "2025-07-02", price: 320 },
                    { date: "2025-07-03", price: 450 },
                    { date: "2025-07-04", price: 380 },
                    { date: "2025-07-05", price: 520 },
                ]} teamMembers={["Shahar Dagan", "Haris Rashid"]} teamName={"SHDHR"} />
                
                {/* Abraham Dada Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 150 },
                    { date: "2025-07-02", price: 280 },
                    { date: "2025-07-03", price: 190 },
                    { date: "2025-07-04", price: 340 },
                    { date: "2025-07-05", price: 410 },
                ]} teamMembers={["Abraham (Avram) Dada", "Bruno Calcagno"]} teamName={"ADBC"} />
                
                {/* Grzegorz Maniak Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 300 },
                    { date: "2025-07-02", price: 420 },
                    { date: "2025-07-03", price: 380 },
                    { date: "2025-07-04", price: 550 },
                    { date: "2025-07-05", price: 480 },
                ]} teamMembers={["Grzegorz (Greg) Maniak", "Adi Singh"]} teamName={"GMAS"} />
                
                {/* Sandro Schönhoff Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 200 },
                    { date: "2025-07-02", price: 350 },
                    { date: "2025-07-03", price: 290 },
                    { date: "2025-07-04", price: 430 },
                    { date: "2025-07-05", price: 370 },
                ]} teamMembers={["Sandro Schönhoff", "Alexandre Pantalacci"]} teamName={"SSAP"} />
                
                {/* Sagar Chethan Kumar Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 250 },
                    { date: "2025-07-02", price: 400 },
                    { date: "2025-07-03", price: 320 },
                    { date: "2025-07-04", price: 480 },
                    { date: "2025-07-05", price: 390 },
                ]} teamMembers={["Sagar Chethan Kumar", "Merouane Zouaid"]} teamName={"SCMZ"} />
                
                {/* Sebastian Bitsch Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 180 },
                    { date: "2025-07-02", price: 310 },
                    { date: "2025-07-03", price: 260 },
                    { date: "2025-07-04", price: 390 },
                    { date: "2025-07-05", price: 340 },
                ]} teamMembers={["Sebastian Bitsch", "Mehdi Rais"]} teamName={"SBRM"} />
                
                {/* Marius Manolachi Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 220 },
                    { date: "2025-07-02", price: 380 },
                    { date: "2025-07-03", price: 290 },
                    { date: "2025-07-04", price: 450 },
                    { date: "2025-07-05", price: 410 },
                ]} teamMembers={["Marius Manolachi", "Aidan Ferguson"]} teamName={"MFA"} />
                
                {/* Jacob Peake Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 190 },
                    { date: "2025-07-02", price: 330 },
                    { date: "2025-07-03", price: 270 },
                    { date: "2025-07-04", price: 400 },
                    { date: "2025-07-05", price: 360 },
                ]} teamMembers={["Jacob Peake", "Felipe Bononi Bello"]} teamName={"JPFB"} />
                
                {/* Nicolas Vizioli Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 240 },
                    { date: "2025-07-02", price: 410 },
                    { date: "2025-07-03", price: 350 },
                    { date: "2025-07-04", price: 520 },
                    { date: "2025-07-05", price: 470 },
                ]} teamMembers={["Nicolas Vizioli", "Kenzo Heijman"]} teamName={"NVKH"} />
                
                {/* Jens Thomsen Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 170 },
                    { date: "2025-07-02", price: 290 },
                    { date: "2025-07-03", price: 230 },
                    { date: "2025-07-04", price: 370 },
                    { date: "2025-07-05", price: 320 },
                ]} teamMembers={["Jens Thomsen", "Alexander Wiener"]} teamName={"JTWA"} />
                
                {/* Dionysis Xynos Team */}
                <ChartAreaInteractive data={[
                    { date: "2025-07-01", price: 210 },
                    { date: "2025-07-02", price: 360 },
                    { date: "2025-07-03", price: 280 },
                    { date: "2025-07-04", price: 440 },
                    { date: "2025-07-05", price: 380 },
                ]} teamMembers={["Dionysis Xynos"]} teamName={"DX"} />
            </div>
  );
}