import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock } from 'lucide-react';
import { Container, Section, Heading, Text, Button, Card, Input, Textarea, Select, Label, ErrorMessage, FormGroup } from '../../components/ui';
import { useToastStore } from '../../store/useToastStore';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  category: z.string().min(1, 'Please select a topic category'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
});

export default function ContactPage() {
  const { showToast } = useToastStore();
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', category: 'general', subject: '', message: '' },
  });

  const onSubmit = async (data) => {
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setTicketId(json.ticket_id);
        setSubmitted(true);
        showToast(`Ticket ${json.ticket_id} created. Check your email for confirmation.`, 'success');
      } else {
        showToast(json.message || 'Failed to send. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please check your connection and try again.', 'error');
    }
  };


  return (
    <div className="bg-slate-50/60 font-sans text-slate-900 min-h-[calc(100vh-200px)] py-12 md:py-16">
      <Container size="6xl">
        <div className="text-center space-y-3 mb-10 max-w-2xl mx-auto">
          <Heading level={1} className="text-3xl font-extrabold tracking-tight">Contact Support & Sales</Heading>
          <Text className="text-slate-600">Have a question, feedback, or partnership inquiry? We are here to help.</Text>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Contact Information Column */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 bg-white border border-slate-200/80 shadow-xs space-y-6">
              <Heading level={2} className="text-lg font-bold">Get In Touch</Heading>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Email Support</div>
                    <div className="text-xs text-slate-500">support@nearbylocator.com</div>
                    <div className="text-xs text-slate-400">Response time: &lt; 24 hours</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Hours of Operation</div>
                    <div className="text-xs text-slate-500">Monday – Friday: 9:00 AM – 6:00 PM EST</div>
                    <div className="text-xs text-slate-400">Weekend Emergency On-Call</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Global Headquarters</div>
                    <div className="text-xs text-slate-500">100 Spatial Way, Suite 400</div>
                    <div className="text-xs text-slate-500">San Francisco, CA 94107, USA</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 text-xs text-slate-500 space-y-1">
                <span className="font-semibold text-slate-700">Looking for self-service help?</span>
                <p>Check out our <a href="/help" className="text-blue-600 font-bold hover:underline">Help Center & FAQ</a> for immediate answers.</p>
              </div>
            </Card>
          </div>

          {/* Right Interactive Form Column */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8 bg-white border border-slate-200/80 shadow-xs">
              {submitted ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <Heading level={2} className="text-xl font-bold">Message Sent!</Heading>
                  {ticketId && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-mono font-semibold">
                      🎫 Ticket ID: {ticketId}
                    </div>
                  )}
                  <Text size="sm" className="text-slate-600 max-w-sm mx-auto">
                    A confirmation email has been sent to your inbox with your ticket details. Our support team will respond shortly.
                  </Text>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setTicketId('');
                      reset();
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <Heading level={2} className="text-lg font-bold mb-2">Send Us a Message</Heading>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormGroup>
                      <Label htmlFor="name" required>Your Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        error={errors.name?.message}
                        isDisabled={isSubmitting}
                        {...register('name')}
                      />
                      <ErrorMessage message={errors.name?.message} />
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="email" required>Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        error={errors.email?.message}
                        isDisabled={isSubmitting}
                        {...register('email')}
                      />
                      <ErrorMessage message={errors.email?.message} />
                    </FormGroup>
                  </div>

                  <FormGroup>
                    <Label htmlFor="category" required>Topic Category</Label>
                    <Select
                      id="category"
                      error={errors.category?.message}
                      isDisabled={isSubmitting}
                      {...register('category')}
                      options={[
                        { value: 'general', label: 'General Inquiry' },
                        { value: 'technical', label: 'Technical & API Support' },
                        { value: 'billing', label: 'Billing & Account' },
                        { value: 'privacy', label: 'Data Privacy & Security' },
                        { value: 'partnerships', label: 'Business Partnerships' },
                      ]}
                    />
                    <ErrorMessage message={errors.category?.message} />
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="subject" required>Subject</Label>
                    <Input
                      id="subject"
                      type="text"
                      placeholder="Brief overview of your inquiry"
                      error={errors.subject?.message}
                      isDisabled={isSubmitting}
                      {...register('subject')}
                    />
                    <ErrorMessage message={errors.subject?.message} />
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="message" required>Message</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      placeholder="Please describe your question or feedback in detail..."
                      error={errors.message?.message}
                      isDisabled={isSubmitting}
                      {...register('message')}
                    />
                    <ErrorMessage message={errors.message?.message} />
                  </FormGroup>

                  <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
