import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import UploadForm from "@/components/UploadForm";
import { Button } from "@/components/ui/button";
import { getBookQuota } from "@/lib/subscription-server";

const Page = async () => {
    await auth.protect();

    // Checked here so a user at their limit never reaches the form — parsing the
    // PDF and uploading to blob storage before rejecting them wastes both their
    // time and paid storage.
    const { allowed, plan, maxBooks } = await getBookQuota();

    if (!allowed) {
        return (
            <main className="new-book">
                <section className="flex flex-col gap-5 text-center">
                    <h1 className="page-title-xl">Book Limit Reached</h1>
                    <p className="subtitle">
                        Your {plan} plan includes {maxBooks} {maxBooks === 1 ? "book" : "books"}.
                        Upgrade to add more, or remove an existing book to free up a slot.
                    </p>
                </section>

                <div className="flex justify-center gap-3">
                    <Button render={<Link href="/subscriptions" />}>View plans</Button>
                    <Button render={<Link href="/" />} variant="outline">Back to library</Button>
                </div>
            </main>
        )
    }

    return (
        <main className="new-book">
            <section className="flex flex-col gap-5 text-center">
                <h1 className="page-title-xl">Add a New Book</h1>
                <p className="subtitle">Upload a PDF to generate your  interactive reading experience</p>
            </section>

            <UploadForm />
        </main>
    )
}

export default Page