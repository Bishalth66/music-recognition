import ToolBox from "./ToolBox"

const Hero = () => {
  return (
    <div className='w-full h-[calc(100vh-64px)] p-10  flex justify-center'>
        <div >
        <h1 className='text-4xl font-bold tracking-tighter leading-relaxed'>Where sound meets discovery.</h1>
        <p className='max-w-xl'>A real-time music detection experience that transforms everyday audio into recognizable tracks, artists, and vibes, so you never miss a moment of sound again.</p>
        <ToolBox />
        </div>
        
    </div>
  )
}

export default Hero