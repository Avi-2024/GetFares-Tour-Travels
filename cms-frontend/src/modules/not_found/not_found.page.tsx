import { Component } from "react";

class NotFoundPage extends Component {
  render() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
            Page not found
          </p>
          <h1 className="font-display text-3xl font-semibold">
            We could not find that screen
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The Get2Vacation CMS route you tried does not exist yet. Head back
            to the login screen to continue.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }
}

export default NotFoundPage;
