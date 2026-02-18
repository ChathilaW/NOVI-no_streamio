'use client'

import Image from "next/image"
import DateAndTime from "./DateAndTime"

const StatusBar = () => {
    return (
        <section className="flex flex-col gap-5 text-black 
        items-center md:items-start">

            {/* Render the DateAndTime component */}
                <DateAndTime/>

            {/* Display an image with specific styles */}
                <Image 
                    src='/assets/home-image.svg' 
                    width={400} 
                    height={400} 
                    alt="home image" 
                    className="max-md:hidden -ml-16"
                />

        </section>
    )
}

export default StatusBar