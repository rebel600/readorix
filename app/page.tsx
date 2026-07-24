import BookCard from "@/components/BookCard";
import HeroSection from "@/components/HeroSection";
import Search from "@/components/Search";
import { getAllBooks } from "@/lib/actions/book.actions";

const Page = async ({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited. A repeated param
  // (?query=a&query=b) arrives as an array, so it's normalized to a single term.
  searchParams: Promise<{ query?: string | string[] }>;
}) => {
  const { query } = await searchParams;
  const searchQuery = (Array.isArray(query) ? query[0] : query ?? "").trim();

  const bookResults = await getAllBooks(searchQuery);

  // An empty grid and a failed query look identical to the user, so the reason
  // has to reach the server log or the outage is invisible.
  if (!bookResults.success) {
    console.error('Failed to load books for the home page:', bookResults.error);
  }

  const books = bookResults.success ? bookResults.data ?? [] : [];

  return (
    <main className="wrapper">
      <HeroSection />

      <div className="library-filter-bar">
        <h2 className="section-title">
          {searchQuery ? "Search Results" : "Recent Books"}
        </h2>
        <Search query={searchQuery} />
      </div>

      {!bookResults.success ? (
        // A failed query must not masquerade as an empty library — that would
        // tell the user to "add a book" when the real problem is on our end.
        <div className="library-empty-card text-center">
          <p className="text-(--text-primary) text-lg font-bold">
            We couldn&rsquo;t load your books
          </p>
          <p className="text-(--text-muted) text-sm mt-1">
            Something went wrong on our end. Please refresh the page to try again.
          </p>
        </div>
      ) : books.length > 0 ? (
        <div className="library-books-grid">
          {books.map((book) => (
            <BookCard
              key={book.slug}
              title={book.title}
              author={book.author}
              coverURL={book.coverURL}
              slug={book.slug}
            />
          ))}
        </div>
      ) : (
        <div className="library-empty-card text-center">
          {searchQuery ? (
            <>
              <p className="text-(--text-primary) text-lg font-bold">
                No books match &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-(--text-muted) text-sm mt-1">
                Try a different title or author.
              </p>
            </>
          ) : (
            <>
              <p className="text-(--text-primary) text-lg font-bold">
                Your library is empty
              </p>
              <p className="text-(--text-muted) text-sm mt-1">
                Add a book to get started.
              </p>
            </>
          )}
        </div>
      )}
    </main>
  );
};

export default Page;
