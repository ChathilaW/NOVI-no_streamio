import CallList from "@/components/CallList";

const recordings =() =>{
    return (
        <section className="flex size-full flex-col gap-10 text-white animate-fade-in">
           <h1 className="text-3xl text-black text-center mt-3">recordings</h1>

            <CallList type="recordings"/>
      
        </section>
    );
      
      
};
export default recordings;

   