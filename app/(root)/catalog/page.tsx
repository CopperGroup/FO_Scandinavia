import React from 'react'
import Filter from '@/components/filter/Filter'
import ProductCard from '@/components/cards/ProductCard'
import Search from '@/components/shared/Search'
import PaginationForCatalog from '@/components/shared/PaginationForCatalog'

import { getSession } from '@/lib/getServerSession'
import BannerSmall from '@/components/banner/BannerSmall'
import { fetchCatalogWithCache } from '@/lib/actions/redis/catalog.actions'
import { getCounts, getFiltredProducts, groupProducts, pretifyProductName, processProductParams } from '@/lib/utils'
import { Metadata } from 'next';
import { FilterSettingsData } from '@/lib/types/types'
import PurchaseNotification from '@/components/shared/PurhaseNotification'

export const metadata: Metadata = {
  title: "Catalog",
  robots: {
    index: false,
    follow: true
  }
}


const Catalog = async ({searchParams }:any) => {
  let { data: filtredProducts, categories, filterSettingsData }: { data: any[], categories: { name: string, categoryId: string, totalProducts: number, subCategories: string[] }[], filterSettingsData: { filterSettings: FilterSettingsData, delay: number } } = await fetchCatalogWithCache();

  // filtredProducts = filterProductsByKey(filtredProducts, "articleNumber", "-", 0);
  
  let { filterSettings, delay } = filterSettingsData

  // filtredProducts = groupProducts(filtredProducts)
  const email = await getSession()

  if(searchParams.sort === 'low_price'){
    filtredProducts = filtredProducts.sort((a,b) => a.price - b.price)
  }else if(searchParams.sort == 'hight_price'){
    filtredProducts.sort((a,b) => b.price - a.price)
  }
  
  // console.log(filtredProducts.find(p => p.name === "Чоботи Tretorn гумові 44 Синій 1518326-04-44"))
  const searchedCategories = searchParams.categories 

  filtredProducts = filtredProducts.filter(product => {

    const matchesCategories = searchedCategories ? categories.filter(cat => searchedCategories.includes(cat.categoryId)).map(cat => cat.categoryId).some(id => product.category.includes(id)) : true;

    return matchesCategories;
  })


  const unitParams: Record<string, { totalProducts: number, type: string, min: number, max: number }> = {};
  const selectParams: Record<string, { totalProducts: number, type: string, values: { value: string, valueTotalProducts: number }[] }> = {};

  // Iterate over filterSettings
  if(searchedCategories) {
    Object.entries(filterSettings).forEach(([categoryId, categoryData]) => {
      // Check if categoryId is in searchedCategories
      if (!searchedCategories.includes(categoryId)) return;
  
      Object.entries(categoryData.params).forEach(([paramName, paramData]) => {
        if (paramData.type.startsWith("unit-")) {
          unitParams[paramName] = { totalProducts: paramData.totalProducts, type: paramData.type, min: 0, max: 0};
        } else if (paramData.type === "select") {
          selectParams[paramName] = { totalProducts: paramData.totalProducts, type: paramData.type, values: []};
        }
      });
    });
  }
  
  processProductParams(filtredProducts, unitParams, selectParams);
  
  
  const maxPrice = Math.max(...filtredProducts.map(item => item.priceToShow));
  const minPrice = Math.min(...filtredProducts.map(item => item.priceToShow));
  const vendors = Array.from(new Set (filtredProducts.map(item => item.vendor))).filter(function(item) {return item !== '';});

  filtredProducts = getFiltredProducts(filtredProducts, searchParams);
  
  const counts = getCounts(filtredProducts)

  const countOfPages = Math.ceil(filtredProducts.length/12)
  const pageNumber = searchParams.page

  let min = 0
  let max = 12


  if(pageNumber === 1 || pageNumber === undefined){
    
  } else{
      min = (pageNumber-1)*12
      max = min+12
  } 
  const displayedProducts = filtredProducts.slice(min, max);
  const totalProducts = filtredProducts.length;

  return (
    <>
      <section className='relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30'>
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#006AA7]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FECC02]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        <div className="relative z-10">
          <BannerSmall/>
          <div className="relative flex mt-12 gap-6 max-lg:flex-col">
            <Filter  
            category={searchParams.category} 
            minPrice={minPrice} 
            maxPrice={maxPrice} 
            categories={categories}
            checkParams={{vendors}} 
            selectParams={selectParams}
            unitParams={unitParams}
            delay={delay}
            counts={counts}
            />
            <div className='w-full flex flex-col'>
              {/* Search and Sort Section */}
              <div className='w-full mb-8 px-4 max-lg:px-6'>
                <div className='bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20'>
                  <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
                    <div className='flex-1 w-full sm:max-w-md'>
                      <Search initialSearchText={searchParams.search}/>
                    </div>
                    {totalProducts > 0 && (
                      <div className='text-small-medium text-slate-600 whitespace-nowrap bg-gradient-to-r from-[#006AA7] to-[#005a8e] bg-clip-text text-transparent font-semibold'>
                        Знайдено товарів: <span className='text-slate-800 font-bold'>{totalProducts}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            
              {/* Products Grid */}
              {displayedProducts.length > 0 ? (
                <>
                  <div className='grid gap-6 grid-cols-4 px-4 max-2xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-2 max-[560px]:grid-cols-1 max-lg:px-6'>
                    {displayedProducts.map((product, index) =>(
                      <div 
                        key={product.id} 
                        className='w-full'
                        style={{ 
                          animation: `fadeInUp 0.6s ease-out ${index * 50}ms forwards`,
                          opacity: 0
                        }}
                      >
                        <ProductCard 
                          id={product._id}
                          productId={product.id}
                          email={email}
                          url={product.url} 
                          price={product.price} 
                          imageUrl={product.images[0]} 
                          description={product.description.replace(/[^а-яА-ЯіІ]/g, ' ').substring(0, 35) + '...'}  
                          priceToShow={product.priceToShow} 
                          name={pretifyProductName(product.name, [], product.articleNumber || "", 0)}
                          // @ts-ignore
                          likedBy={product.likedBy}
                        />
                      </div>
                    ))}        
                  </div>
                  {countOfPages > 1 && (
                    <div className='mt-12 px-4 max-lg:px-6'>
                      <PaginationForCatalog minPrice={minPrice} maxPrice={maxPrice} countOfPages={countOfPages} />
                    </div>
                  )}
                </>
              ) : (
                <div className='flex flex-col items-center justify-center py-20 px-4 text-center bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 mx-4 max-lg:mx-6'>
                  <div className='mb-6 relative'>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#006AA7]/20 to-[#FECC02]/20 rounded-full blur-2xl"></div>
                    <svg className='w-24 h-24 text-slate-300 mx-auto relative z-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                  </div>
                  <h3 className='text-heading3-bold text-slate-800 mb-3 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent'>Товари не знайдено</h3>
                  <p className='text-base-regular text-slate-600 max-w-md leading-relaxed'>
                    Спробуйте змінити параметри пошуку або фільтри, щоб знайти потрібні товари.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* <PurchaseNotification products={filtredProducts.map(p => ({ id: p._id.toString(), name: pretifyProductName(p.name, [], p.articleNumber || "", 0), image: p.images[0] }))} minInterval={30000} maxInterval={45000} maxNotifications={3} /> */}
    </>
  )
};



export default Catalog;