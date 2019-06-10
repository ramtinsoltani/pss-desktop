import { Directive } from '@angular/core';
import { NG_VALIDATORS, AbstractControl, Validator, ValidationErrors } from '@angular/forms';

@Directive({
  selector: '[password]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: PasswordValidatorDirective, multi: true }
  ]
})
export class PasswordValidatorDirective implements Validator {

  constructor() { }

  public validate(control: AbstractControl): ValidationErrors {

    return control.value && control.value.length > 8 && control.value.length < 64 && /[a-z]+/i.test(control.value) && /[0-9]+/.test(control.value) ? null : { password: false };

  }

}
