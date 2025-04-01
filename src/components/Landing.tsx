'use client'

import { useState, useEffect } from 'react'
import { Menu, X, ChevronRight } from 'lucide-react'
import { Carousel } from '../components/Carousel'

const navigation = [
  { name: 'Home', href: '#home' },
  { name: 'Nuestro trabajo', href: '#about' },
  { name: 'Sobre Nosotros', href: '#work' },
  { name: 'Contáctenos', href: '#contact' },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = (e: Event) => {
      e.preventDefault()
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href')
      if (href && href.startsWith('#')) {
        const targetId = href.replace('#', '')
        const elem = document.getElementById(targetId)
        elem?.scrollIntoView({ behavior: 'smooth' })
      }
    }

    const links = document.querySelectorAll('a[href^="#"]')
    links.forEach(link => link.addEventListener('click', handleScroll))

    return () => {
      links.forEach(link => link.removeEventListener('click', handleScroll))
    }
  }, [])

  return (
    <div className="bg-white">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5">
              <span className="sr-only">Next Inventory</span>
              <img
                className="h-8 w-auto"
                src="/logo3.png"
                alt="Your Company Logo"
                width={32}
                height={32}
              />
            </a>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-semibold leading-6 text-gray-900">
                {item.name}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a href="/signin" className="text-sm font-semibold leading-6 text-gray-900 mr-4">
              Sign in
            </a>
            <a href="#" className="text-sm font-semibold leading-6 text-gray-900">
              Get Started <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </nav>
        <div className={`lg:hidden ${mobileMenuOpen ? '' : 'hidden'}`} role="dialog" aria-modal="true">
          <div className="fixed inset-0 z-50"></div>
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">Your Company</span>
                <img
                  className="h-8 w-auto"
                  src="/logo3.png"
                  alt="Your Company Logo"
                  width={32}
                  height={32}
                />
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6">
                  <a
                    href="#"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    Get Started
                  </a>
                  <a
                    href="/signin"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    Sign In
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="isolate">
        {/* Hero section */}
        <div id="home" className="relative pt-14">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          <div className="py-12 sm:py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Next Inventory: Revolucionando la industria
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Descubra cómo nuestra solución innovadora está transformando empresas y mejorando vidas.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <a
                    href="#"
                    className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Get started
                  </a>
                  <a href="#about" className="text-sm font-semibold leading-6 text-gray-900">
                    Más información <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Us section */}
        <div id="about" className="overflow-hidden bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 items-center">
              <div className="lg:pr-8 lg:pt-4">
                <div className="lg:max-w-lg">
                  <h2 className="text-base font-semibold leading-7 text-indigo-600">Nuestro Trabajo</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Un mejor flujo de trabajo</p>
                  <p className="mt-6 text-lg leading-8 text-gray-600">
                  En Next Inventory, hemos creado una solución innovadora diseñada especialmente para comerciantes de tenis que buscan simplificar la gestión de su negocio y llevarlo al siguiente nivel. Nuestra aplicación no es solo una herramienta, es un aliado que transforma la forma en que administras tu inventario, facturas y ventas, ahorrándote tiempo, reduciendo errores y permitiéndote enfocarte en lo que más importa: crecer y satisfacer a tus clientes.
                  </p>
                  <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                    {[
                      {
                        name: 'Gestión de inventario sin complicaciones',
                        description: 'Cada par de tenis en tu bodega queda registrado con un sistema de codificación claro y preciso. Olvídate de las hojas de cálculo desordenadas o las cuentas manuales: nuestro sistema actualiza automáticamente el inventario con cada venta, asegurando que siempre sepas lo que tienes disponible en tiempo real.',
                      },
                      {
                        name: 'Facturación ágil y profesional',
                        description: 'Genera facturas para cada una de tus tiendas en pocos clics. Ya sea una venta grande o pequeña, la app te permite emitir documentos claros y personalizados, mientras el inventario se ajusta al instante. Todo queda organizado y listo para tus registros.',
                      },
                      {
                        name: 'Exporta y organiza con facilidad',
                        description: 'Descarga tus inventarios y facturas en formatos PDF o Excel cuando lo necesites. Ya sea para revisar tus números, compartir información con tu equipo o preparar reportes, tienes el control total en tus manos.',
                      },
                      {
                        name: 'Promoción directa y personalizada',
                        description: 'Llega a tus clientes como nunca antes. Con plantillas personalizables, puedes compartir tus productos directamente por WhatsApp, destacando modelos, ofertas o novedades en segundos. Convierte cada mensaje en una oportunidad de venta.',
                      },
                    ].map((feature) => (
                      <div key={feature.name} className="relative pl-9">
                        <dt className="inline font-semibold text-gray-900">
                          <ChevronRight className="absolute left-1 top-1 h-5 w-5 text-indigo-600" aria-hidden="true" />
                          {feature.name}
                        </dt>{' '}
                        <dd className="inline">{feature.description}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <Carousel
                images={[
                  { src: "/2.jpg", alt: "Product 2" },
                  { src: "/0.jpg", alt: "Product 0" },
                  { src: "/3.jpg", alt: "Product 3" },
                  { src: "/1.jpg", alt: "Product 1" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Work section */}
        <div id="work" className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-indigo-600">Sobre Nosotros</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Transformando industrias
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
              En Next Inventory, somos más que un equipo de desarrolladores: somos apasionados por simplificar la vida de los comerciantes de tenis como tú. Nuestra historia comenzó con una idea clara: crear una herramienta que no solo resuelva los dolores de cabeza de la gestión diaria, sino que también impulse el crecimiento de los negocios en un mercado tan dinámico y competitivo como el de los tenis.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                {[
                  {
                    name: '¿Quiénes somos?',
                    description: 'Somos un grupo de emprendedores, diseñadores y expertos en tecnología que conocemos de cerca los retos de manejar inventarios, facturar ventas y mantener todo en orden mientras intentas destacar entre la competencia. Nos inspiramos en las necesidades reales de los comerciantes de tenis, desde las pequeñas tiendas locales hasta los distribuidores con varias sucursales, para construir una solución práctica, moderna y fácil de usar.',
                  },
                  {
                    name: 'Nuestra misión',
                    description: 'Queremos que tengas el control total de tu negocio sin perder tiempo en tareas complicadas. Por eso diseñamos Next Inventory, una aplicación pensada para ahorrarte esfuerzo, organizar tu operación y ayudarte a vender más. Creemos que la tecnología debe ser tu aliada, no un obstáculo, y trabajamos todos los días para que nuestra herramienta sea justo eso: un apoyo confiable que crece contigo.',
                  },
                  {
                    name: '¿Qué nos mueve?',
                    description: 'Nos apasiona el mundo de los tenis tanto como a ti. Sabemos lo que significa lidiar con inventarios que cambian rápido, clientes exigentes y la necesidad de estar siempre un paso adelante. Por eso, nuestro compromiso es ofrecerte una app que no solo funcione, sino que se adapte a tu ritmo y te dé la libertad de enfocarte en lo que amas: vender tenis y hacer felices a tus clientes.',
                  },
                  {
                    name: 'Buscando soluciones',
                    description: 'En Next Inventory, no solo creamos software, construimos soluciones para que tu negocio prospere. Estamos aquí para acompañarte en cada paso del camino, porque tu éxito es el nuestro.',
                  },
                ].map((feature) => (
                  <div key={feature.name} className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                        <ChevronRight className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      {feature.name}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Contact Us section */}
        <div id="contact" className="bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Contáctenos</h2>
              <p className="mt-2 text-lg leading-8 text-gray-600">
                Nos encantaría saber de usted. Hablemos sobre cómo podemos ayudar a que su negocio crezca.
              </p>
            </div>
            <form action="#" method="POST" className="mx-auto mt-16 max-w-xl sm:mt-20">
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-semibold leading-6 text-gray-900">
                    Nombre
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="text"
                      name="first-name"
                      id="first-name"
                      autoComplete="given-name"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="last-name" className="block text-sm font-semibold leading-6 text-gray-900">
                    Apellido
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="text"
                      name="last-name"
                      id="last-name"
                      autoComplete="family-name"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-semibold leading-6 text-gray-900">
                    Email
                  </label>
                  <div className="mt-2.5">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      autoComplete="email"
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="message" className="block text-sm font-semibold leading-6 text-gray-900">
                    Mensaje
                  </label>
                  <div className="mt-2.5">
                    <textarea
                      name="message"
                      id="message"
                      rows={4}
                      className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      defaultValue={''}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <button
                  type="submit"
                  className="block w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Enviar mensaje
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            {[
              { name: 'Facebook', href: '#' },
              { name: 'Instagram', href: '#' },
              { name: 'Twitter', href: '#' },
              { name: 'GitHub', href: '#' },
              { name: 'YouTube', href: '#' },
            ].map((item) => (
              <a key={item.name} href={item.href} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">{item.name}</span>
                {/* Add appropriate icon component here */}
              </a>
            ))}
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} Next Inventory, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}