import BookCard from "@/components/BookCard";
import HeroSection from "@/components/HeroSection";
import { getAllBooks } from "@/lib/actions/book.actions";
const Page = async () => {
  
  const bookResults = await getAllBooks();

  // An empty grid and a failed query look identical to the user, so the reason
  // has to reach the server log or the outage is invisible.
  if (!bookResults.success) {
    console.error('Failed to load books for the home page:', bookResults.error);
  }

  const books = bookResults.success ? bookResults.data ?? [] : [];

  return (
    <main className="wrapper">
      <HeroSection />

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
    </main>
  );
};

export default Page;
