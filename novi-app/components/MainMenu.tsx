'use client'

import { useRouter } from "next/navigation"
import MenuItemCard from "./MenuItemCard"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import DatePicker from "react-datepicker"
import { useUser } from "@clerk/nextjs"
import Loading from "./Loading"
import { toast } from "sonner"

const initialValues = {
    dateTime: new Date(), // Default meeting date/time = now
    description: '', // Meeting description
    link: '', // Meeting link for joining
  };

const MainMenu = () => {
    return (
      <section className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Dialog >
          <DialogTrigger >
            <MenuItemCard
              img="/assets/new-meeting.svg"
              title="New Meeting"
              bgColor='bg-orange-500'
              hoverColor= 'hover:bg-orange-800'
              />
          </DialogTrigger>
              
          <DialogContent className=" bg-gray-200 px-16 py-10 text-gray-900 rounded-3xl" >
            <DialogHeader>
              <DialogTitle
                className='text-3xl font-black leading-relaxed text-center '>
                Start an Instant Meeting 🤝
              </DialogTitle>
            
              <DialogDescription className='flex flex-col items-center '>
                Add a meeting description
                <Textarea
                  className="inputs p-5"
                  rows={4}
                  onChange={(e) =>
                  setValues({ ...values, description: e.target.value })}
                />  
              
                <Button 
                  className='mt-5 font-extrabold text-lg text-white rounded-xl 
                  bg-blue-700 py-5 px-10 hover:bg-blue-900 hover:scale-110 
                  transition ease-in-out delay-75 duration-700 hover:-translate-y-1 cursor-pointer'
                  onClick={() => setMeetingState('Instant')}>
                  Create Meeting
                </Button>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Dialog >
          <DialogTrigger>
            <MenuItemCard
              img="/assets/join-meeting.svg"
              title="Join Meeting"
              bgColor="bg-blue-600"
              hoverColor= 'hover:bg-blue-800'
            />
          </DialogTrigger>

          <DialogContent className=" bg-gray-200 px-16 py-10 text-gray-900 rounded-3xl" >
        
            <DialogHeader>
              <DialogTitle
                className='text-3xl font-black leading-relaxed text-center mb-5 '>
                Type the Meeting link here
              </DialogTitle>

              <DialogDescription className='flex flex-col gap-3 items-center'>
                <Input 
                  type='text' 
                  placeholder="Meeting Link" 
                  onChange={(e) => setValues({ ...values, link: e.target.value })}
                  className='inputs'/>
                
                <Button 
                  className='mt-5 font-extrabold text-lg text-white rounded-xl 
                  bg-blue-700 py-5 px-10 hover:bg-blue-900 hover:scale-110 
                  transition ease-in-out delay-75 duration-700 hover:-translate-y-1 cursor-pointer'
                  onClick={() => router.push(values.link)}>
                  Join Meeting
                </Button>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Dialog >
          <DialogTrigger>
            <MenuItemCard
              img="/assets/calendar.svg"
              title="Schedule"
              bgColor="bg-blue-600"
              hoverColor= 'hover:bg-blue-800'/>
          </DialogTrigger>

          <DialogContent className=" bg-gray-200 px-16 py-10 text-gray-900 !rounded-3xl" >
        
            <DialogHeader>
              <DialogTitle
                className='text-3xl font-black leading-relaxed text-center mb-5 '>
                Schedule Meeting
              </DialogTitle>

              <DialogDescription className='flex flex-col gap-3'>
                Add a meeting description

                <Textarea
                  className="inputs p-5"
                  rows={4}
                  onChange={(e) =>
                  setValues({ ...values, description: e.target.value })} 
                />  
              </DialogDescription>

              <div className="flex w-full flex-col gap-2.5">
                <label className="text-base font-normal leading-[22.4px] text-sky-2">
                  Select Date and Time
                </label>
                <DatePicker
                  preventOpenOnFocus
                  selected={values.dateTime}
                  onChange={(date: Date | null) => 
                    setValues({ ...values, dateTime: date! })}
                  showTimeSelect
                  timeIntervals={15}
                  timeCaption="time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="inputs w-full rounded p-2 focus:outline-hidden 
                    focus:border-blue-500 focus:ring-3 focus:ring-blue-200  "
                />
              </div>

              <Button className='!mt-5 font-extrabold text-lg text-white rounded-xl 
                bg-blue-700 py-5 px-10 hover:bg-blue-900 hover:scale-110 
                transition ease-in-out delay-75 duration-700 hover:-translate-y-1 cursor-pointer'
                onClick={() => setMeetingState('Schedule')}>
                Submit
              </Button>
            </DialogHeader>
          </DialogContent>
        </Dialog>

      <MenuItemCard
        img="/assets/recordings2.svg"
        title="Recordings"
        bgColor="bg-blue-600"
        hoverColor= 'hover:bg-blue-800'
        handleClick={() => router.push('/recordings')}
      />

      {/* For reports */}
      <MenuItemCard
          img="/assets/reports2.svg"
          title="Reports"
          bgColor="bg-blue-600"
          hoverColor= 'hover:bg-blue-800'
          handleClick={() => router.push('/reports')}
      />
    </section>
  )
}

export default MainMenu