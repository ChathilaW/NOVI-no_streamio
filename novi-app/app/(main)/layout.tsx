import StreamProvider from "@/providers/StreamProvider"
import { SignIn } from "@clerk/nextjs"
import { currentUser } from "@clerk/nextjs/server"
import { neobrutalism } from "@clerk/themes"
import Image from "next/image"
import React from "react"


const MainLayout = async ({
    children
}: {
    children: React.ReactNode
}
) => {

    const user = await currentUser()
    if(!user)   return (
    // Main container for the page
    <main className="flex flex-col items-center p-5 gap-10 animate-fade-in">

        {/* Section: logo + heading */}
        <section className="flex flex-col items-center">
            <Image
                src='/assets/logo.svg' // Path to logo imag
                width={100}     // Image width (px)
                height={100}    // Image height (px)
                alt="Logo"      // Alternative text for accessibility
                />

            {/* Main title text under the logo */}
            <h1 className="text-lg font-extrabold lg:text-2xl">
                    Connect, Communicate, Collaborate in Real-Time
            </h1>
                     
        </section>

            {/* Wrapper for the sign-in component (spacing above) */}
            <div className="mt-3">

                {/* Clerk SignIn UI component */}
                <SignIn
                routing="hash"
                    appearance={{
                        baseTheme: neobrutalism
                    }}
                />
        </div>
    </main>
  )

    return (
        <main className="animate-fade-in">
            
                {children}
            

        </main>

    )

}

export default MainLayout