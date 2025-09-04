
const Header = () => {
  return (
    <>
      <header className="sticky top-0 inset-x-0 flex flex-wrap md:justify-start md:flex-nowrap z-50 w-full text-sm">
        <nav className="mt-4 relative max-w-2xl w-full bg-white border border-gray-200 rounded-[24px] mx-2 flex flex-wrap md:flex-nowrap items-center justify-between p-1 pl-4 md:py-0 sm:mx-auto">
          <div className="flex items-center">
            <a
              className="flex-none rounded-md text-xl inline-block font-semibold focus:outline-none focus:opacity-80"
              href="../templates/personal/index.html"
              aria-label="Preline"
            >
              <img
              src="/lo.png"
              width={50}
              height={50}
              />
            </a>
            <div className="ml-1 sm:ml-2"></div>
          </div>

          <div className="flex items-center gap-1 md:order-4 md:ml-4">
            <a
              className="w-full sm:w-auto whitespace-nowrap py-2 px-3 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-full border border-transparent bg-gray-800 text-white hover:bg-gray-900 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              href="#"
            >
              Contact
            </a>

            <div className="md:hidden">
              <button
                type="button"
                className="hs-collapse-toggle flex justify-center items-center w-9 h-9 border border-gray-200 text-gray-500 rounded-full hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
                id="hs-navbar-header-floating-collapse"
                aria-expanded="false"
                aria-controls="hs-navbar-header-floating"
                aria-label="Toggle navigation"
                data-hs-collapse="#hs-navbar-header-floating"
              >
                <svg
                  className="hs-collapse-open:hidden shrink-0 w-3.5 h-3.5"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" x2="21" y1="6" y2="6" />
                  <line x1="3" x2="21" y1="12" y2="12" />
                  <line x1="3" x2="21" y1="18" y2="18" />
                </svg>
                <svg
                  className="hs-collapse-open:block hidden shrink-0 w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div
            id="hs-navbar-header-floating"
            className="hidden hs-collapse overflow-hidden transition-all duration-300 basis-full grow md:block"
            aria-labelledby="hs-navbar-header-floating-collapse"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 md:gap-3 mt-3 md:mt-0 py-2 md:py-0 md:pl-7">
              <a
                className="py-0.5 md:py-3 px-4 md:px-1 border-l-2 md:border-l-0 md:border-b-2 border-gray-800 font-medium text-gray-800 hover:text-gray-800 focus:outline-none"
                href="#"
                aria-current="page"
              >
                Home
              </a>
              <a
                className="py-0.5 md:py-3 px-4 md:px-1 border-l-2 md:border-l-0 md:border-b-2 border-transparent text-gray-500 hover:text-gray-800 focus:outline-none"
                href="#"
              >
                Tool
              </a>
              <a
                className="py-0.5 md:py-3 px-4 md:px-1 border-l-2 md:border-l-0 md:border-b-2 border-transparent text-gray-500 hover:text-gray-800 focus:outline-none"
                href="#"
              >
                About
              </a>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;
