"use client";

export default function Footer() {
  return (
    <footer className="w-full border-t transition-colors bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">CogniTest</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A scientifically-backed cognitive screening platform.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Product</h4>
            <ul className="space-y-2">
              <li><a href="/tests" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Tests</a></li>
              <li><a href="/results" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Results</a></li>
              <li><a href="/#about" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">About</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Research</a></li>
              <li><a href="#" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Documentation</a></li>
              <li><a href="#" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Privacy</a></li>
              <li><a href="#" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Terms</a></li>
              <li><a href="#" className="text-sm hover:opacity-70 transition text-gray-600 dark:text-gray-400">Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} CogniTest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
