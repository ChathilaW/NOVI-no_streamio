import { ThreeDot } from "react-loading-indicators";

const Loading = () => {
  return (
    <div className="flex min-h-screen items-center justify-center animate-fade-in">
      
      <ThreeDot variant="bounce" color="#da32f8ff" size="medium" text="" textColor="" />  

    </div>
  );
};

export default Loading;