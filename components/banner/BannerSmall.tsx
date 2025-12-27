import { Store } from "@/constants/store";

const BannerSmall = () => {
  return (
    <article className="w-full h-72 group flex justify-center items-center rounded-3xl overflow-hidden shadow-2xl relative" style={{ backgroundImage: `url(/assets/banner-hero.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Multi-layer gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
      
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      
      {/* Glowing text container */}
      <div className="relative z-10">
        <h1 className="text-[56px] bg-gradient-to-r from-[#006AA7] to-[#005a8e] font-semibold text-white py-4 px-8 leading-tight max-[440px]:text-[48px] max-[370px]:text-[40px] rounded-xl shadow-2xl relative transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-[#006AA7]/50">
          <span className="relative z-10">{Store.name}</span>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#006AA7] to-[#005a8e] rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 -z-10"></div>
        </h1>
      </div>
      
      {/* Decorative corner elements */}
      <div className="absolute top-4 left-4 w-20 h-20 border-t-2 border-l-2 border-white/30 rounded-tl-2xl"></div>
      <div className="absolute bottom-4 right-4 w-20 h-20 border-b-2 border-r-2 border-white/30 rounded-br-2xl"></div>
    </article>
  )
}

export default BannerSmall;