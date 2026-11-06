'use client';
import Swal from 'sweetalert2';

/** SweetAlert2 styled with the app's own buttons and font, used in place of window.confirm / prompt / alert. */
const AppSwal = Swal.mixin({
    buttonsStyling: false,
    reverseButtons: true,
    customClass: {
        popup: 'cs-swal-popup',
        confirmButton: 'btn-primary',
        cancelButton: 'btn-secondary',
        actions: 'cs-swal-actions',
    },
});

/** Asks a yes/no question; resolves true only when the user confirms. */
export async function confirmDialog(title: string, text?: string, confirmText = 'Confirm') {
    const result = await AppSwal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText: confirmText });
    return result.isConfirmed;
}

/** Asks for a line of text; resolves the trimmed value, or null when cancelled or left empty. */
export async function promptDialog(title: string, placeholder?: string, confirmText = 'Save') {
    const result = await AppSwal.fire({
        title, input: 'text', inputPlaceholder: placeholder, showCancelButton: true, confirmButtonText: confirmText,
        inputValidator: value => (value.trim() ? null : 'Please enter a value.'),
    });
    return result.isConfirmed ? String(result.value).trim() : null;
}

/** Shows an error message with a single OK button. */
export async function errorDialog(text: string, title = 'Something went wrong') {
    await AppSwal.fire({ icon: 'error', title, text, confirmButtonText: 'OK' });
}
