import { Search as SearchIcon } from "lucide-react";
import { searchBooks } from "@/lib/actions/book.actions";

// A plain server-action form: no "use client", no debounce, no client fetch.
// Submitting (Enter or the icon button) navigates to /?query=… via the action's
// redirect, so the search is shareable, bookmarkable, and works even without
// JavaScript. `defaultValue` keeps the box in sync with the current URL.
const Search = ({ query = "" }: { query?: string }) => {
  return (
    <form action={searchBooks} role="search" className="library-search-wrapper">
      <button
        type="submit"
        aria-label="Search books"
        className="pl-4 flex items-center cursor-pointer"
      >
        <SearchIcon size={20} className="text-(--text-muted)" aria-hidden="true" />
      </button>

      <label htmlFor="book-search" className="sr-only">
        Search books by title or author
      </label>
      <input
        id="book-search"
        type="search"
        name="query"
        defaultValue={query}
        placeholder="Search by title or author"
        autoComplete="off"
        enterKeyHint="search"
        className="library-search-input border-none shadow-none focus-visible:ring-0"
      />
    </form>
  );
};

export default Search;
