import { Directive } from '@angular/core';
import { NG_VALIDATORS, AbstractControl, Validator, ValidationErrors } from '@angular/forms';
import isURL from 'validator/lib/isURL';

@Directive({
  selector: '[url]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: UrlValidatorDirective, multi: true }
  ]
})
export class UrlValidatorDirective implements Validator {

  constructor() { }

  public validate(control: AbstractControl): ValidationErrors {

    if ( control.value === 'http://localhost' || control.value === 'https://localhost' ) return null;

    return control.value && isURL(control.value, {
      protocols: ['http', 'https'],
      require_protocol: true,
      disallow_auth: true
    }) ? null : { url: false };

  }

}
