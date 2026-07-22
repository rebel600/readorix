import BookCard from "@/components/BookCard";
import HeroSection from "@/components/HeroSection";
import { getAllBooks } from "@/lib/actions/book.actions";
const Page = async () => {
  
  const bookResults = await getAllBooks();

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
