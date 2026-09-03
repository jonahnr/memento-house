import {LegalPage} from "../legal-page";
import {ContactForm} from "./contact-form";
export const metadata={title:"Contact — Memento House"};
export default function Contact(){return <LegalPage eyebrow="We’re here to help" title="Contact Memento House"><p>Send us your order question or custom celebration idea below. We’ll reply to the email address you provide.</p><p>For order support, include your order number and celebration date when available. For a custom inquiry, tell us the celebration, product, date, guest count, and experience you have in mind. Never send passwords or full payment card details.</p><ContactForm/></LegalPage>}
